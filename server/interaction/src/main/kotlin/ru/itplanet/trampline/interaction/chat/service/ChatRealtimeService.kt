package ru.itplanet.trampline.interaction.chat.service

import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.interaction.chat.model.ChatMessageCommandResult
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

interface ChatRealtimeService {
    fun handleSendMessage(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String,
    )

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
        file: MultipartFile,
    ): ChatMessageCommandResult
}
