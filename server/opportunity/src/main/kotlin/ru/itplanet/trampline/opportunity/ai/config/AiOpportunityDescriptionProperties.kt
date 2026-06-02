package ru.itplanet.trampline.opportunity.ai.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("app.ai.description-generation")
data class AiOpportunityDescriptionProperties(
    val enabled: Boolean = false,
    val promptVersion: String = "ai-opportunity-description-v1",
    val maxInputChars: Int = 6000,
    val maxNotesChars: Int = 2000,
    val maxShortDescriptionChars: Int = 1000,
    val maxFullDescriptionChars: Int = 4000,
    val maxRequirementsChars: Int = 2000,
)
