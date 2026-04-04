package ru.itplanet.trampline.profile.model.request

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min

data class GetApplicantProfileListRequest(
    @field:Min(value = 1, message = "Параметр limit должен быть не меньше 1")
    @field:Max(value = 100, message = "Параметр limit должен быть не больше 100")
    val limit: Int = 20,

    @field:Min(value = 0, message = "Параметр offset не может быть отрицательным")
    val offset: Long = 0,

    val cityId: Long? = null,
    val skillTagIds: List<Long> = emptyList(),
    val interestTagIds: List<Long> = emptyList(),
    val openToWork: Boolean? = null,
    val openToEvents: Boolean? = null,
    val search: String? = null,
)
