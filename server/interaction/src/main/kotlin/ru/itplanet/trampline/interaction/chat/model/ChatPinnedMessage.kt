package ru.itplanet.trampline.interaction.chat.model

import java.time.OffsetDateTime

data class ChatPinnedMessage(
    val messageId: Long,
    val pinnedByUserId: Long,
    val pinnedAt: OffsetDateTime,
    val preview: String,
)
