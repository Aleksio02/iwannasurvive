package ru.itplanet.trampline.interaction.chat.service

import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.interaction.chat.model.ChatMessageCommandResult
import ru.itplanet.trampline.interaction.chat.model.response.ChatAttachmentDownloadUrlResponse
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

interface ChatMessageCommandService {
    fun sendMessage(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String,
        replyToMessageId: Long? = null,
    ): ChatMessageCommandResult

    fun sendAttachment(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String?,
        file: MultipartFile,
        replyToMessageId: Long? = null,
    ): ChatMessageCommandResult

    fun editMessage(
        dialogId: Long,
        messageId: Long,
        currentUser: AuthenticatedUser,
        body: String,
    ): ChatMessageCommandResult

    fun editMessageContent(
        dialogId: Long,
        messageId: Long,
        currentUser: AuthenticatedUser,
        body: String?,
        removeAttachmentIds: List<Long>,
        file: MultipartFile?,
    ): ChatMessageCommandResult

    fun deleteForMe(
        dialogId: Long,
        messageId: Long,
        currentUser: AuthenticatedUser,
    )

    fun deleteForEveryone(
        dialogId: Long,
        messageId: Long,
        currentUser: AuthenticatedUser,
    ): ChatMessageCommandResult

    fun forwardMessage(
        sourceDialogId: Long,
        messageId: Long,
        targetDialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
    ): ChatMessageCommandResult

    fun getAttachmentDownloadUrl(
        dialogId: Long,
        attachmentId: Long,
        currentUser: AuthenticatedUser,
    ): ChatAttachmentDownloadUrlResponse
}
