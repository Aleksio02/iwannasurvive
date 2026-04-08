package ru.itplanet.trampline.auth.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "auth.registration-verification")
data class RegistrationVerificationProperties(
    var codeTtlMinutes: Long = 10,
    var resendCooldownSeconds: Long = 60,
    var maxVerifyAttempts: Int = 5,
    var mailFrom: String = "no-reply@tramplin.local",
    var subject: String = "Подтверждение регистрации Tramplin"
)
