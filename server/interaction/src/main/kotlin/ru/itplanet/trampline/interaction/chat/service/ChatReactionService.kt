package ru.itplanet.trampline.interaction.chat.service

import ru.itplanet.trampline.interaction.chat.model.ChatMessage
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

interface ChatReactionService {
    fun setReaction(
        dialogId: Long,
        messageId: Long,
        currentUser: AuthenticatedUser,
        reaction: String,
    ): ChatMessage

    fun deleteReaction(
        dialogId: Long,
        messageId: Long,
        currentUser: AuthenticatedUser,
    ): ChatMessage
}
