package ru.itplanet.trampline.profile.model

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import ru.itplanet.trampline.profile.model.enums.ContactType

data class ContactMethod(
    val type: ContactType,
    @field:NotBlank
    @field:Size(max = 255)
    val value: String,
    @field:Size(max = 120)
    val label: String? = null,
)
