package ru.itplanet.trampline.interaction.chat.service

import jakarta.persistence.EntityNotFoundException
import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatDialogDao
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogDto
import ru.itplanet.trampline.interaction.dao.OpportunityResponseDao
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseDto
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
            .orElseThrow { EntityNotFoundException("Chat dialog not found") }

        if (!isParticipant(dialog, currentUserId)) {
            throw AccessDeniedException("You are not a participant of this dialog")
        }

        return dialog
    }

    override fun assertCanRead(
        dialog: ChatDialogDto,
        currentUser: AuthenticatedUser,
    ): OpportunityResponseDto {
        if (!isParticipant(dialog, currentUser.userId)) {
            throw AccessDeniedException("You are not a participant of this dialog")
        }

        return opportunityResponseDao.findById(dialog.opportunityResponseId)
            .orElseThrow { EntityNotFoundException("Response not found") }
    }

    override fun assertCanWrite(
        dialog: ChatDialogDto,
        currentUser: AuthenticatedUser,
    ): OpportunityResponseDto {
        val response = assertCanRead(dialog, currentUser)

        if (!ChatPolicy.canWrite(dialog.status, response.status)) {
            throw AccessDeniedException("Chat is read-only for current response state")
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
