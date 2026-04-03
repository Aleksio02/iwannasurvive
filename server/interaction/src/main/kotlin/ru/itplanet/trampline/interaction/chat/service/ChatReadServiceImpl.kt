package ru.itplanet.trampline.interaction.chat.service

import jakarta.persistence.EntityNotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatMessageDao
import ru.itplanet.trampline.interaction.chat.dao.ChatParticipantStateDao
import ru.itplanet.trampline.interaction.security.AuthenticatedUser
import java.time.OffsetDateTime

@Service
class ChatReadServiceImpl(
    private val chatAccessService: ChatAccessService,
    private val chatMessageDao: ChatMessageDao,
    private val chatParticipantStateDao: ChatParticipantStateDao,
) : ChatReadService {

    @Transactional
    override fun markRead(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        lastReadMessageId: Long,
    ) {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanRead(dialog, currentUser)

        val message = chatMessageDao.findById(lastReadMessageId)
            .orElseThrow { EntityNotFoundException("Chat message not found") }

        val messageId = message.id
            ?: throw IllegalStateException("Chat message id must not be null")

        if (message.dialogId != dialogId) {
            throw EntityNotFoundException("Chat message does not belong to dialog")
        }

        val participantState = chatParticipantStateDao.findByIdDialogIdAndIdUserId(
            dialogId = dialogId,
            userId = currentUser.userId,
        ) ?: throw IllegalStateException(
            "Chat participant state not found for dialog $dialogId and user ${currentUser.userId}",
        )

        val currentLastReadMessageId = participantState.lastReadMessageId
        if (currentLastReadMessageId != null && currentLastReadMessageId >= messageId) {
            return
        }

        participantState.lastReadMessageId = messageId
        participantState.lastReadAt = OffsetDateTime.now()
        chatParticipantStateDao.save(participantState)
    }
}
