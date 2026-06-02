package ru.itplanet.trampline.opportunity.model

import java.time.OffsetDateTime

data class PersonalizedOpportunityRecommendationPage(
    val items: List<PersonalizedOpportunityRecommendationItem>,
    val limit: Int,
    val totalCandidates: Int,
    val generatedAt: OffsetDateTime,
)

data class PersonalizedOpportunityRecommendationItem(
    val opportunity: OpportunityListItem,
    val score: Int,
    val matchLevel: RecommendationMatchLevel,
    val matchedSkills: List<String>,
    val matchedInterests: List<String>,
    val missingSkills: List<String>,
    val reasons: List<String>,
    val improvementTips: List<String>,
    val explanation: PersonalizedRecommendationExplanation,
    val isFavorite: Boolean,
)

data class PersonalizedRecommendationExplanation(
    val source: RecommendationExplanationSource,
    val summary: String,
    val whyFits: List<String>,
    val whatToImprove: List<String>,
)

enum class RecommendationExplanationSource {
    AI,
    RULES,
}

enum class RecommendationMatchLevel {
    HIGH,
    MEDIUM,
    LOW,
}
