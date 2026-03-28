package ru.itplanet.trampline.profile.model

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class ProfileLink(
    @field:Size(max = 120)
    val label: String? = null,
    @field:NotBlank
    @field:Size(max = 2048)
    val url: String,
)
