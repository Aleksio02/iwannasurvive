package ru.itplanet.trampline.opportunity.ai.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("app.ai.resume-analysis")
data class AiResumeAnalysisProperties(
    val enabled: Boolean = false,
    val promptVersion: String = "ai-resume-analysis-v1",
    val maxInputChars: Int = 6000,
    val maxCandidateTags: Int = 300,
    val maxSuggestedSkills: Int = 10,
    val maxSuggestedInterests: Int = 5,
    val maxStrengths: Int = 4,
    val maxImprovementTips: Int = 5,
    val maxOpportunityPreview: Int = 3,
    val minInputChars: Int = 80,
    val maxFileBytes: Long = 20L * 1024L * 1024L,
)
