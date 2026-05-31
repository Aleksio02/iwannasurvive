package ru.itplanet.trampline.interaction.chat.service

import ru.itplanet.trampline.interaction.security.AuthenticatedUser

interface ChatReadService {
    fun markRead(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        lastReadMessageId: Long,
    )
}
