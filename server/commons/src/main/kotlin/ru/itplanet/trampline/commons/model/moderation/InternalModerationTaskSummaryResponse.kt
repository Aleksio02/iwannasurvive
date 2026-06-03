package ru.itplanet.trampline.commons.model.moderation

import java.time.OffsetDateTime

data class InternalModerationTaskSummaryResponse(
    val id: Long,
    val entityType: ModerationEntityType,
    val entityId: Long,
    val taskType: ModerationTaskType,
    val status: String,
    val priority: ModerationTaskPriority,
    val active: Boolean,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
    val resolvedAt: OffsetDateTime?,
    val resolutionComment: String?,
    val history: List<InternalModerationTaskHistoryItemResponse> = emptyList(),
)
