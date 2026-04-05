package ru.itplanet.trampline.interaction.chat.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatMessageDao
import ru.itplanet.trampline.interaction.exception.InteractionInternalException
import ru.itplanet.trampline.interaction.exception.InteractionNotFoundException
import ru.itplanet.trampline.interaction.security.AuthenticatedUser
import java.time.OffsetDateTime

@Service
class ChatReadServiceImpl(
    private val chatAccessService: ChatAccessService,
    private val chatMessageDao: ChatMessageDao,
    private val chatParticipantStateService: ChatParticipantStateService,
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
            .orElseThrow {
                InteractionNotFoundException(
                    message = "Сообщение чата не найдено",
                    code = "chat_message_not_found",
                )
            }

        val messageId = message.id
            ?: throw InteractionInternalException(
                message = "Не найден идентификатор сообщения чата",
                code = "chat_message_id_missing",
            )

        if (message.dialogId != dialogId) {
            throw InteractionNotFoundException(
                message = "Сообщение чата не найдено",
                code = "chat_message_not_found",
            )
        }

        val participantState = chatParticipantStateService.getOrCreateParticipantState(
            dialog = dialog,
            userId = currentUser.userId,
        )

        val currentLastReadMessageId = participantState.lastReadMessageId
        if (currentLastReadMessageId != null && currentLastReadMessageId >= messageId) {
            return
        }

        participantState.lastReadMessageId = messageId
        participantState.lastReadAt = OffsetDateTime.now()
    }
}
