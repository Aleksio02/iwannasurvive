package ru.itplanet.trampline.profile.model

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import ru.itplanet.trampline.profile.model.enums.ContactType

data class ContactMethod(
    val type: ContactType,
    @field:NotBlank(message = "Значение контакта обязательно")
    @field:Size(max = 255, message = "Значение контакта не должно превышать 255 символов")
    val value: String,
    @field:Size(max = 120, message = "Подпись контакта не должна превышать 120 символов")
    val label: String? = null,
)
