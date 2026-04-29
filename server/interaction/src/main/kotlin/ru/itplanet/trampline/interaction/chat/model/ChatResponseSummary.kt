package ru.itplanet.trampline.interaction.chat.model

import java.time.OffsetDateTime

data class ChatResponseSummary(
    val opportunityResponseId: Long,
    val dialogId: Long,
    val unreadCount: Long,
    val canSend: Boolean,
    val lastMessageAt: OffsetDateTime?,
)
