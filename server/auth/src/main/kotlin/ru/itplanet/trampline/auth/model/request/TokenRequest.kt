package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.NotBlank

class TokenRequest(
    val token: @NotBlank(message = "Token cannot be blank") String
)