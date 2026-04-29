package ru.itplanet.trampline.interaction.chat.service

import ru.itplanet.trampline.interaction.chat.model.ChatMessageCommandResult
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

interface ChatMessageCommandService {
    fun sendMessage(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String,
    ): ChatMessageCommandResult
}
