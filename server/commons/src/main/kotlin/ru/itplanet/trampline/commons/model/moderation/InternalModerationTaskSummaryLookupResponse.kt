package ru.itplanet.trampline.commons.model.moderation

data class InternalModerationTaskSummaryLookupResponse(
    val exists: Boolean,
    val task: InternalModerationTaskSummaryResponse? = null,
)
