package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.NotBlank

data class TwoFactorResendRequest(
    @field:NotBlank(message = "Временный токен обязателен")
    val pendingToken: String,
)
