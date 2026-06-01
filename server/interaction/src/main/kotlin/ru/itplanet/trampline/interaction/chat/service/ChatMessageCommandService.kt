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
    ): ChatMessageCommandResult

    fun sendAttachment(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String?,
        file: MultipartFile,
    ): ChatMessageCommandResult

    fun getAttachmentDownloadUrl(
        dialogId: Long,
        attachmentId: Long,
        currentUser: AuthenticatedUser,
    ): ChatAttachmentDownloadUrlResponse
}
