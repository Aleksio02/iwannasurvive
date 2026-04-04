package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min

data class GetCuratorsRequest(
    @field:Min(value = 1, message = "Параметр limit должен быть не меньше 1")
    @field:Max(value = 100, message = "Параметр limit должен быть не больше 100")
    val limit: Int = 20,

    @field:Min(value = 0, message = "Параметр offset не может быть отрицательным")
    val offset: Long = 0,

    val search: String? = null,
)
