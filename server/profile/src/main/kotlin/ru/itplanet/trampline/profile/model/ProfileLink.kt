package ru.itplanet.trampline.profile.model

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class ProfileLink(
    @field:Size(max = 120, message = "Название ссылки не должно превышать 120 символов")
    val label: String? = null,
    @field:NotBlank(message = "Ссылка обязательна")
    @field:Size(max = 2048, message = "Ссылка не должна превышать 2048 символов")
    val url: String,
)
