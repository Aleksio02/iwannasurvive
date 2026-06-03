package ru.itplanet.trampline.commons.model.profile

import ru.itplanet.trampline.commons.model.Tag

data class InternalApplicantRecommendationContextResponse(
    val userId: Long,
    val cityId: Long?,
    val cityName: String?,
    val course: Short?,
    val graduationYear: Short?,
    val openToWork: Boolean,
    val openToEvents: Boolean,
    val skills: List<Tag>,
    val interests: List<Tag>,
)
