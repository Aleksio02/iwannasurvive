package ru.itplanet.trampline.moderation.model.response

data class ModerationDashboardResponse(
    val openCount: Long,
    val inProgressCount: Long,
    val myInProgressCount: Long,
    val countsByEntityType: Map<ModerationEntityType, Long>,
    val countsByPriority: Map<ModerationTaskPriority, Long>
)
