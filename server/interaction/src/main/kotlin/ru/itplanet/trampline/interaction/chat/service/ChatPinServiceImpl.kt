package ru.itplanet.trampline.interaction.chat.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatDialogQueryDao
import ru.itplanet.trampline.interaction.chat.dao.ChatMessageDao
import ru.itplanet.trampline.interaction.chat.dao.ChatPinnedMessageDao
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatPinnedMessageDto
import ru.itplanet.trampline.interaction.chat.model.ChatDialog
import ru.itplanet.trampline.interaction.exception.InteractionBadRequestException
import ru.itplanet.trampline.interaction.exception.InteractionNotFoundException
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

@Service
class ChatPinServiceImpl(
    private val chatAccessService: ChatAccessService,
    private val chatDialogQueryDao: ChatDialogQueryDao,
    private val chatMessageDao: ChatMessageDao,
    private val chatPinnedMessageDao: ChatPinnedMessageDao,
) : ChatPinService {
    @Transactional
    override fun pin(dialogId: Long, messageId: Long, currentUser: AuthenticatedUser): ChatDialog {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanWrite(dialog, currentUser)
        val message = chatMessageDao.findVisibleByIdAndDialogIdForUser(
            messageId = messageId,
            dialogId = dialogId,
            currentUserId = currentUser.userId,
        ) ?: throw InteractionNotFoundException("Сообщение чата не найдено", "chat_message_not_found")
        if (message.deletedAt != null) {
            throw InteractionBadRequestException("Сообщение нельзя закрепить", "chat_pin_not_allowed")
        }
        val pinned = chatPinnedMessageDao.findByDialogId(dialogId)
            ?: ChatPinnedMessageDto(dialogId, messageId, currentUser.userId)
        pinned.messageId = messageId
        pinned.pinnedByUserId = currentUser.userId
        chatPinnedMessageDao.save(pinned)
        return currentDialog(dialogId, currentUser.userId)
    }

    @Transactional
    override fun unpin(dialogId: Long, currentUser: AuthenticatedUser): ChatDialog {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanWrite(dialog, currentUser)
        chatPinnedMessageDao.deleteByDialogId(dialogId)
        return currentDialog(dialogId, currentUser.userId)
    }

    private fun currentDialog(dialogId: Long, currentUserId: Long): ChatDialog {
        return chatDialogQueryDao.findDialog(dialogId, currentUserId)
            ?: throw InteractionNotFoundException("Диалог чата не найден", "chat_dialog_not_found")
    }
}
