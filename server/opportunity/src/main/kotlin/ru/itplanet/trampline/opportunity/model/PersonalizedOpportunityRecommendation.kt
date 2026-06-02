package ru.itplanet.trampline.opportunity.model

import java.time.OffsetDateTime

data class PersonalizedOpportunityRecommendationPage(
    val items: List<PersonalizedOpportunityRecommendationItem>,
    val limit: Int,
    val totalCandidates: Int,
    val generatedAt: OffsetDateTime,
    val emptyReason: RecommendationEmptyReason? = null,
    val profileHints: RecommendationProfileHints? = null,
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

enum class RecommendationEmptyReason {
    PROFILE_SIGNALS_MISSING,
    NO_ELIGIBLE_MATCHES,
    NO_ACTIVE_CANDIDATES,
}

data class RecommendationProfileHints(
    val hasSkills: Boolean,
    val hasInterests: Boolean,
    val hasCity: Boolean,
)
