package ru.itplanet.trampline.interaction.chat.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatDialogDao
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogDto
import ru.itplanet.trampline.interaction.dao.OpportunityResponseDao
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseDto
import ru.itplanet.trampline.interaction.exception.InteractionConflictException
import ru.itplanet.trampline.interaction.exception.InteractionForbiddenException
import ru.itplanet.trampline.interaction.exception.InteractionNotFoundException
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

@Service
@Transactional(readOnly = true)
class ChatAccessServiceImpl(
    private val chatDialogDao: ChatDialogDao,
    private val opportunityResponseDao: OpportunityResponseDao,
) : ChatAccessService {

    override fun assertDialogParticipant(
        dialogId: Long,
        currentUserId: Long,
    ): ChatDialogDto {
        val dialog = chatDialogDao.findById(dialogId)
            .orElseThrow {
                InteractionNotFoundException(
                    message = "Диалог чата не найден",
                    code = "chat_dialog_not_found",
                )
            }

        if (!isParticipant(dialog, currentUserId)) {
            throw InteractionForbiddenException(
                message = "Доступ к диалогу чата разрешён только его участникам",
                code = "chat_dialog_participant_required",
            )
        }

        return dialog
    }

    override fun assertCanRead(
        dialog: ChatDialogDto,
        currentUser: AuthenticatedUser,
    ): OpportunityResponseDto {
        if (!isParticipant(dialog, currentUser.userId)) {
            throw InteractionForbiddenException(
                message = "Доступ к диалогу чата разрешён только его участникам",
                code = "chat_dialog_participant_required",
            )
        }

        return opportunityResponseDao.findById(dialog.opportunityResponseId)
            .orElseThrow {
                InteractionNotFoundException(
                    message = "Отклик не найден",
                    code = "opportunity_response_not_found",
                )
            }
    }

    override fun assertCanWrite(
        dialog: ChatDialogDto,
        currentUser: AuthenticatedUser,
    ): OpportunityResponseDto {
        val response = assertCanRead(dialog, currentUser)

        if (!ChatPolicy.canWrite(dialog.status, response.status)) {
            throw InteractionConflictException(
                message = "Чат недоступен для отправки сообщений в текущем статусе отклика",
                code = "chat_write_not_allowed",
            )
        }

        return response
    }

    private fun isParticipant(
        dialog: ChatDialogDto,
        currentUserId: Long,
    ): Boolean {
        return dialog.applicantUserId == currentUserId || dialog.employerUserId == currentUserId
    }
}
