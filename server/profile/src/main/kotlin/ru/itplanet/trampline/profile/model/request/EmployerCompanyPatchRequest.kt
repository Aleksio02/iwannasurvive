package ru.itplanet.trampline.profile.model.request

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import jakarta.validation.constraints.Size

@JsonIgnoreProperties(ignoreUnknown = true)
data class EmployerCompanyPatchRequest(
    val legalName: String? = null,
    @field:Size(min = 10, max = 12, message = "ИНН должен содержать от 10 до 12 символов")
    val inn: String? = null,
)
