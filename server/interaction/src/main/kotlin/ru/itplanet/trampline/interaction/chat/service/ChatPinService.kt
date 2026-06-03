package ru.itplanet.trampline.interaction.chat.service

import ru.itplanet.trampline.interaction.chat.model.ChatDialog
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

interface ChatPinService {
    fun pin(dialogId: Long, messageId: Long, currentUser: AuthenticatedUser): ChatDialog
    fun unpin(dialogId: Long, currentUser: AuthenticatedUser): ChatDialog
}
