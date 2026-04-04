package ru.itplanet.trampline.interaction.model.request

import jakarta.validation.constraints.Positive

data class ContactRequest(
    @field:Positive(message = "Идентификатор контакта должен быть положительным")
    val contactUserId: Long,
)
