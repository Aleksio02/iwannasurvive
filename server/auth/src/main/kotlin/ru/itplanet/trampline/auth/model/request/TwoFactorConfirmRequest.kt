package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

data class TwoFactorConfirmRequest(
    @field:NotBlank(message = "Временный токен обязателен")
    val pendingToken: String,

    @field:NotBlank(message = "Код обязателен")
    @field:Pattern(regexp = "^\\d{6}$", message = "Код должен содержать 6 цифр")
    val code: String,
)
