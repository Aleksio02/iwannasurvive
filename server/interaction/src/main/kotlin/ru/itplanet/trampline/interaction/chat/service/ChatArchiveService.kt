package ru.itplanet.trampline.interaction.chat.service

import ru.itplanet.trampline.interaction.security.AuthenticatedUser

interface ChatArchiveService {
    fun archive(
        dialogId: Long,
        currentUser: AuthenticatedUser,
    )

    fun unarchive(
        dialogId: Long,
        currentUser: AuthenticatedUser,
    )
}
