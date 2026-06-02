package ru.itplanet.trampline.opportunity.ai.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("app.ai.tag-suggestions")
data class AiTagSuggestionProperties(
    val enabled: Boolean = false,
    val promptVersion: String = "ai-tag-suggestions-v1",
    val maxInputChars: Int = 6000,
    val maxCandidateTags: Int = 300,
    val maxSuggestions: Int = 7,
    val timeoutMs: Long = 10000,
)
