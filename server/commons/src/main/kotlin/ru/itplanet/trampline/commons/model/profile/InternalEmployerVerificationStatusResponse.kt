package ru.itplanet.trampline.commons.model.profile

data class InternalEmployerVerificationStatusResponse(
    val employerUserId: Long,
    val verificationStatus: String,
    val employerVerified: Boolean,
)
