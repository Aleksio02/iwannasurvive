package ru.itplanet.trampline.interaction.chat.service

import feign.FeignException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatDialogDao
import ru.itplanet.trampline.interaction.chat.dao.ChatDialogQueryDao
import ru.itplanet.trampline.interaction.chat.dao.ChatParticipantStateDao
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatParticipantStateDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatParticipantStateDtoId
import ru.itplanet.trampline.interaction.chat.mapper.ChatDomainMapper
import ru.itplanet.trampline.interaction.chat.model.ChatDialog
import ru.itplanet.trampline.interaction.client.InternalOpportunityServiceClient
import ru.itplanet.trampline.interaction.dao.ContactInfoApplicantProfileDao
import ru.itplanet.trampline.interaction.dao.OpportunityResponseDao
import ru.itplanet.trampline.interaction.exception.InteractionConflictException
import ru.itplanet.trampline.interaction.exception.InteractionForbiddenException
import ru.itplanet.trampline.interaction.exception.InteractionIntegrationException
import ru.itplanet.trampline.interaction.exception.InteractionNotFoundException
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

@Service
class ChatLifecycleServiceImpl(
    private val chatDialogDao: ChatDialogDao,
    private val chatDialogQueryDao: ChatDialogQueryDao,
    private val chatParticipantStateDao: ChatParticipantStateDao,
    private val opportunityResponseDao: OpportunityResponseDao,
    private val contactInfoApplicantProfileDao: ContactInfoApplicantProfileDao,
    private val internalOpportunityServiceClient: InternalOpportunityServiceClient,
    private val chatAccessService: ChatAccessService,
    private val chatDomainMapper: ChatDomainMapper,
) : ChatLifecycleService {

    @Transactional
    override fun ensureDialogByResponse(
        responseId: Long,
        currentUser: AuthenticatedUser,
    ): ChatDialog {
        chatDialogDao.findByOpportunityResponseId(responseId)?.let { existingDialog ->
            val dialogId = existingDialog.id
                ?: throw IllegalStateException("Идентификатор диалога чата не должен быть null")

            chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)

            return chatDialogQueryDao.findDialog(dialogId, currentUser.userId)
                ?: throw IllegalStateException("Диалог чата $dialogId должен быть доступен для чтения")
        }

        val response = opportunityResponseDao.findById(responseId)
            .orElseThrow {
                InteractionNotFoundException(
                    message = "Отклик не найден",
                    code = "opportunity_response_not_found",
                )
            }

        if (response.status in ChatPolicy.TERMINAL_RESPONSE_STATUSES) {
            throw InteractionConflictException(
                message = "Чат нельзя создать для закрытого отклика",
                code = "chat_create_not_allowed_for_closed_response",
            )
        }

        val opportunityContext = try {
            internalOpportunityServiceClient.getChatContext(response.opportunityId)
        } catch (ex: FeignException) {
            when (ex.status()) {
                HttpStatus.NOT_FOUND.value() -> throw InteractionNotFoundException(
                    message = "Возможность не найдена",
                    code = "opportunity_not_found",
                )

                HttpStatus.CONFLICT.value() -> throw InteractionConflictException(
                    message = "Чат для этой возможности сейчас недоступен",
                    code = "opportunity_chat_context_unavailable",
                )

                else -> throw InteractionIntegrationException(
                    message = "Сервис возможностей временно недоступен",
                    code = "opportunity_service_unavailable",
                    status = HttpStatus.SERVICE_UNAVAILABLE,
                )
            }
        }

        if (opportunityContext.opportunityId != response.opportunityId) {
            throw InteractionIntegrationException(
                message = "Сервис возможностей вернул некорректный чат-контекст",
                code = "opportunity_chat_context_invalid",
                status = HttpStatus.SERVICE_UNAVAILABLE,
            )
        }

        val isApplicant = currentUser.userId == response.applicantUserId
        val isEmployer = currentUser.userId == opportunityContext.employerUserId

        if (!isApplicant && !isEmployer) {
            throw InteractionForbiddenException(
                message = "Доступ к отклику и чату разрешён только его участникам",
                code = "opportunity_response_participant_required",
            )
        }

        val applicant = contactInfoApplicantProfileDao.findById(response.applicantUserId)
            .orElseThrow {
                InteractionNotFoundException(
                    message = "Соискатель не найден",
                    code = "applicant_not_found",
                )
            }

        val dialogToSave = ChatDialogDto(
            opportunityResponseId = responseId,
            opportunityId = response.opportunityId,
            applicantUserId = response.applicantUserId,
            employerUserId = opportunityContext.employerUserId,
            opportunityTitleSnapshot = opportunityContext.title,
            companyNameSnapshot = opportunityContext.companyName,
            applicantNameSnapshot = chatDomainMapper.buildApplicantDisplayName(applicant),
        )

        val savedDialog = try {
            chatDialogDao.saveAndFlush(dialogToSave)
        } catch (ex: DataIntegrityViolationException) {
            val existingDialog = chatDialogDao.findByOpportunityResponseId(responseId)
                ?: throw ex

            val dialogId = existingDialog.id
                ?: throw IllegalStateException("Идентификатор диалога чата не должен быть null")

            chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
            ensureParticipantStates(existingDialog)

            return chatDialogQueryDao.findDialog(dialogId, currentUser.userId)
                ?: throw IllegalStateException("Диалог чата $dialogId должен быть доступен для чтения")
        }

        ensureParticipantStates(savedDialog)

        val dialogId = savedDialog.id
            ?: throw IllegalStateException("Идентификатор сохранённого диалога чата не должен быть null")

        return chatDialogQueryDao.findDialog(dialogId, currentUser.userId)
            ?: throw IllegalStateException("Диалог чата $dialogId должен быть доступен для чтения")
    }

    private fun ensureParticipantStates(
        dialog: ChatDialogDto,
    ) {
        val dialogId = dialog.id
            ?: throw IllegalStateException("Идентификатор диалога чата не должен быть null")

        val applicantStateId = ChatParticipantStateDtoId(
            dialogId = dialogId,
            userId = dialog.applicantUserId,
        )
        if (!chatParticipantStateDao.existsById(applicantStateId)) {
            chatParticipantStateDao.save(ChatParticipantStateDto(applicantStateId))
        }

        val employerStateId = ChatParticipantStateDtoId(
            dialogId = dialogId,
            userId = dialog.employerUserId,
        )
        if (!chatParticipantStateDao.existsById(employerStateId)) {
            chatParticipantStateDao.save(ChatParticipantStateDto(employerStateId))
        }
    }
}
