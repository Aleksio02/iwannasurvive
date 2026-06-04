package ru.itplanet.trampline.commons.model.profile

data class InternalEmployerVerificationStatusBatchRequest(
    val employerUserIds: Set<Long>,
)
