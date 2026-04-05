package ru.itplanet.trampline.interaction.chat.service

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
}
