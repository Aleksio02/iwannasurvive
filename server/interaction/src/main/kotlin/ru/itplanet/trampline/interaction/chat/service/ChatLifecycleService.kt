package ru.itplanet.trampline.interaction.chat.service

import ru.itplanet.trampline.interaction.chat.model.ChatDialog
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

interface ChatLifecycleService {
    fun ensureDialogByResponse(
        responseId: Long,
        currentUser: AuthenticatedUser,
    ): ChatDialog
}
