package ru.itplanet.trampline.interaction.chat.service

import jakarta.persistence.EntityNotFoundException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.access.AccessDeniedException
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
import ru.itplanet.trampline.interaction.exception.InteractionException
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
                ?: throw IllegalStateException("Chat dialog id must not be null")

            chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)

            return chatDialogQueryDao.findDialog(dialogId, currentUser.userId)
                ?: throw IllegalStateException("Chat dialog $dialogId must be queryable")
        }

        val response = opportunityResponseDao.findById(responseId)
            .orElseThrow { EntityNotFoundException("Response not found") }

        if (response.status in ChatPolicy.TERMINAL_RESPONSE_STATUSES) {
            throw InteractionException.Conflict("Chat cannot be created for a closed response")
        }

        val opportunityContext = internalOpportunityServiceClient.getChatContext(response.opportunityId)

        if (opportunityContext.opportunityId != response.opportunityId) {
            throw IllegalStateException(
                "Opportunity response ${response.id} references unexpected opportunity context",
            )
        }

        val isApplicant = currentUser.userId == response.applicantUserId
        val isEmployer = currentUser.userId == opportunityContext.employerUserId

        if (!isApplicant && !isEmployer) {
            throw AccessDeniedException("You are not a participant of this response")
        }

        val applicant = contactInfoApplicantProfileDao.findById(response.applicantUserId)
            .orElseThrow { EntityNotFoundException("Applicant not found") }

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
                ?: throw IllegalStateException("Chat dialog id must not be null")

            chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
            ensureParticipantStates(existingDialog)

            return chatDialogQueryDao.findDialog(dialogId, currentUser.userId)
                ?: throw IllegalStateException("Chat dialog $dialogId must be queryable")
        }

        ensureParticipantStates(savedDialog)

        val dialogId = savedDialog.id
            ?: throw IllegalStateException("Saved chat dialog id must not be null")

        return chatDialogQueryDao.findDialog(dialogId, currentUser.userId)
            ?: throw IllegalStateException("Chat dialog $dialogId must be queryable")
    }

    private fun ensureParticipantStates(
        dialog: ChatDialogDto,
    ) {
        val dialogId = dialog.id
            ?: throw IllegalStateException("Chat dialog id must not be null")

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
