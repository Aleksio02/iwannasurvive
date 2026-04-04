package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

data class PasswordResetVerifyRequest(
    @field:Email(message = "Укажите корректный адрес электронной почты")
    @field:NotBlank(message = "Электронная почта обязательна")
    val email: String,

    @field:NotBlank(message = "Код обязателен")
    @field:Pattern(regexp = "\\d{6}", message = "Код должен содержать ровно 6 цифр")
    val code: String,
)
