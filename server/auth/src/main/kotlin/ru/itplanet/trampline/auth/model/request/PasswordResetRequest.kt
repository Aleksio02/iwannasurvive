package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank

data class PasswordResetRequest(
    @field:Email(message = "Укажите корректный адрес электронной почты")
    @field:NotBlank(message = "Электронная почта обязательна")
    val email: String,
)
