package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class PasswordResetConfirmRequest(
    @field:Email(message = "Укажите корректный адрес электронной почты")
    @field:NotBlank(message = "Электронная почта обязательна")
    val email: String,

    @field:NotBlank(message = "Токен сброса пароля обязателен")
    val resetToken: String,

    @field:Size(min = 8, max = 16, message = "Пароль должен содержать от 8 до 16 символов")
    @field:NotBlank(message = "Новый пароль обязателен")
    val newPassword: String,
)
