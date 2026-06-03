package ru.itplanet.trampline.interaction.chat.model.response

import java.time.OffsetDateTime

data class ChatPinnedMessageResponse(
    val messageId: Long,
    val pinnedByUserId: Long,
    val pinnedAt: OffsetDateTime,
    val preview: String,
)
