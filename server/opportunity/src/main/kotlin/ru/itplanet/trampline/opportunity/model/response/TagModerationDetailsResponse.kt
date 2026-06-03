package ru.itplanet.trampline.opportunity.model

import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskSummaryResponse

data class TagModerationDetailsResponse(
    val tag: EmployerTagResponse,
    val task: InternalModerationTaskSummaryResponse?,
    val hasTask: Boolean,
    val hasActiveTask: Boolean,
)
