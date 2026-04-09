package ru.itplanet.trampline.interaction.chat.service

import ru.itplanet.trampline.interaction.chat.model.ChatMessage
import ru.itplanet.trampline.interaction.chat.model.ChatMessageSliceQuery
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

interface ChatMessageQueryService {
    fun getMessages(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        query: ChatMessageSliceQuery,
    ): List<ChatMessage>
}
