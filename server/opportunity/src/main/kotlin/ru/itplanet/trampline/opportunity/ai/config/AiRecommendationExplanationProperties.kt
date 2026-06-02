package ru.itplanet.trampline.opportunity.ai.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("app.ai.recommendation-explanations")
data class AiRecommendationExplanationProperties(
    val enabled: Boolean = false,
    val promptVersion: String = "ai-recommendation-explanations-v1",
    val maxCandidates: Int = 120,
    val maxRecommendations: Int = 6,
    val maxReasons: Int = 3,
    val maxImprovementTips: Int = 3,
)
