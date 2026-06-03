package ru.itplanet.trampline.opportunity.ai.model

data class AiRecommendationExplanationInput(
    val applicantSkills: List<String>,
    val applicantInterests: List<String>,
    val applicantCityName: String?,
    val openToWork: Boolean,
    val openToEvents: Boolean,
    val opportunityTitle: String,
    val companyName: String,
    val opportunityType: String,
    val workFormat: String,
    val grade: String?,
    val opportunityTags: List<String>,
    val score: Int,
    val matchedSkills: List<String>,
    val matchedInterests: List<String>,
    val missingSkills: List<String>,
    val reasons: List<String>,
    val improvementTips: List<String>,
)

data class AiRecommendationExplanationResult(
    val summary: String,
    val whyFits: List<String>,
    val whatToImprove: List<String>,
)
