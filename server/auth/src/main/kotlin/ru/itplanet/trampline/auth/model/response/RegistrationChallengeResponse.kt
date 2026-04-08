package ru.itplanet.trampline.auth.model.response

import java.time.Instant

data class RegistrationChallengeResponse(
    val pendingToken: String,
    val expiresAt: Instant
)
