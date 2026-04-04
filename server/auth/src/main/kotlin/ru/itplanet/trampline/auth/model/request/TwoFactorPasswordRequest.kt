package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class TwoFactorPasswordRequest(
    @field:Size(min = 8, max = 16, message = "Пароль должен содержать от 8 до 16 символов")
    @field:NotBlank(message = "Пароль обязателен")
    val password: String,
)
