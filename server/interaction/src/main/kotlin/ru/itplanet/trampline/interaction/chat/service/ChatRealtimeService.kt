package ru.itplanet.trampline.interaction.chat.service

import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.interaction.chat.model.ChatMessageCommandResult
import ru.itplanet.trampline.interaction.chat.model.ChatDialog
import ru.itplanet.trampline.interaction.chat.model.ChatMessage
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

interface ChatRealtimeService {
    fun handleSendMessage(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String,
        replyToMessageId: Long? = null,
    ): ChatMessageCommandResult

    fun handleMarkRead(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        lastReadMessageId: Long,
    )

    fun handleSendAttachment(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String?,
        files: List<MultipartFile>,
        replyToMessageId: Long? = null,
    ): ChatMessageCommandResult

    fun broadcastMessageUpdated(dialogId: Long, message: ChatMessage)
    fun broadcastMessageCreated(dialogId: Long, message: ChatMessage)
    fun broadcastMessageDeleted(dialogId: Long, message: ChatMessage)
    fun broadcastMessageReactionsUpdated(dialogId: Long, message: ChatMessage)
    fun broadcastMessageHidden(dialogId: Long, targetUserId: Long, messageId: Long)
    fun broadcastDialogUpdated(dialog: ChatDialog)
    fun broadcastReadStateUpdated(dialogId: Long, currentUser: AuthenticatedUser)
    fun handleTyping(dialogId: Long, currentUser: AuthenticatedUser, typing: Boolean)
}
