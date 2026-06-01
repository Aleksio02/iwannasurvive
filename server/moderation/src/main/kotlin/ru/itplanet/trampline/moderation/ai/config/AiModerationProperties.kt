package ru.itplanet.trampline.moderation.ai.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("app.ai.moderation")
data class AiModerationProperties(
    val enabled: Boolean = false,
    val promptVersion: String = "ai-moderation-v2",
    val maxInputChars: Int = 12000,
    val maxReasons: Int = 6,
    val maxHighlightedFields: Int = 8,
    val asyncTimeoutMs: Long = 10000,
    val processingTimeoutMs: Long = 60000,
    val recoveryIntervalMs: Long = 60000,
    val supported: Supported = Supported(),
) {
    data class Supported(
        val opportunityReview: Boolean = true,
        val applicantProfileReview: Boolean = true,
        val employerProfileReview: Boolean = true,
        val employerVerificationReview: Boolean = true,
        val tagReview: Boolean = true,
    )
}
