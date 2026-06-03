package ru.itplanet.trampline.commons.model.moderation

import java.time.OffsetDateTime

data class InternalModerationTaskHistoryItemResponse(
    val action: String,
    val createdAt: OffsetDateTime,
    val actorUserId: Long?,
    val comment: String? = null,
)
