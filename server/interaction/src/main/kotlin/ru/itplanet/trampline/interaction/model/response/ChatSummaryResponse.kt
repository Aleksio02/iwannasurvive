package ru.itplanet.trampline.interaction.model.response

import java.time.OffsetDateTime

data class ChatSummaryResponse(
    val dialogId: Long?,
    val hasChat: Boolean,
    val unreadCount: Long,
    val canSend: Boolean,
    val lastMessageAt: OffsetDateTime?,
) {
    companion object {
        fun noChat(
            canSend: Boolean = false,
        ): ChatSummaryResponse {
            return ChatSummaryResponse(
                dialogId = null,
                hasChat = false,
                unreadCount = 0,
                canSend = canSend,
                lastMessageAt = null,
            )
        }
    }
}
