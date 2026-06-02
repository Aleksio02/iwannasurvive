package ru.itplanet.trampline.opportunity.service

import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.model.enums.Grade
import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.commons.model.enums.TagCategory
import ru.itplanet.trampline.commons.model.enums.WorkFormat
import ru.itplanet.trampline.commons.model.interaction.InternalApplicantOpportunitySignalsResponse
import ru.itplanet.trampline.commons.model.profile.InternalApplicantRecommendationContextResponse
import ru.itplanet.trampline.opportunity.ai.config.AiRecommendationExplanationProperties
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.model.RecommendationMatchLevel
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus
import java.time.OffsetDateTime
import kotlin.math.roundToInt

@Component
class OpportunityRecommendationScoreCalculator(
    private val properties: AiRecommendationExplanationProperties,
) {
    fun calculate(
        opportunity: OpportunityDto,
        applicant: InternalApplicantRecommendationContextResponse,
        signals: InternalApplicantOpportunitySignalsResponse,
        now: OffsetDateTime,
    ): OpportunityRecommendationScore {
        val applicantSkills = applicant.skills.associateBy { it.id }
        val applicantInterests = applicant.interests.associateBy { it.id }
        val techTags = opportunity.tags
            .filter { it.isActive && it.moderationStatus == TagModerationStatus.APPROVED && it.category == TagCategory.TECH }
            .sortedBy { it.name.lowercase() }
        val directionTags = opportunity.tags
            .filter { it.isActive && it.moderationStatus == TagModerationStatus.APPROVED && it.category == TagCategory.DIRECTION }
            .sortedBy { it.name.lowercase() }
        val matchedSkills = techTags.filter { applicantSkills.containsKey(checkNotNull(it.id)) }.map { it.name }
        val matchedInterests = directionTags.filter { applicantInterests.containsKey(checkNotNull(it.id)) }.map { it.name }
        val missingSkills = techTags.filterNot { applicantSkills.containsKey(checkNotNull(it.id)) }.map { it.name }.take(3)
        val skillRatio = if (techTags.isEmpty()) 0.0 else matchedSkills.size.toDouble() / techTags.size
        val interestRatio = if (directionTags.isEmpty()) 0.0 else matchedInterests.size.toDouble() / directionTags.size
        val reasons = mutableListOf<String>()
        val tips = missingSkills.map { "Можно подтянуть $it" }.toMutableList()
        val opportunityId = checkNotNull(opportunity.id)
        val isFavorite = opportunityId in signals.favoriteOpportunityIds
        val hasRequiredSkillMatch = matchedSkills.isNotEmpty() &&
            (skillRatio >= properties.minSkillCoverage.coerceAtLeast(0.0) ||
                matchedSkills.size >= properties.minSkillMatches.coerceAtLeast(1))
        val isEligible = isFavorite || when (opportunity.type) {
            OpportunityType.VACANCY, OpportunityType.INTERNSHIP -> applicant.openToWork && hasRequiredSkillMatch
            OpportunityType.MENTORING -> matchedSkills.isNotEmpty() ||
                (applicant.interests.isNotEmpty() && matchedInterests.isNotEmpty())
            OpportunityType.EVENT -> applicant.openToEvents &&
                (matchedSkills.isNotEmpty() || matchedInterests.isNotEmpty())
        }

        if (!isEligible) {
            return OpportunityRecommendationScore(
                score = 0,
                matchLevel = RecommendationMatchLevel.LOW,
                matchedSkills = matchedSkills,
                matchedInterests = matchedInterests,
                missingSkills = missingSkills,
                reasons = emptyList(),
                improvementTips = tips.take(properties.maxImprovementTips.coerceAtLeast(0)),
                isFavorite = isFavorite,
                isEligible = false,
            )
        }

        var score = (60 * skillRatio).roundToInt()
        if (matchedSkills.isNotEmpty()) {
            reasons += "Совпали навыки ${matchedSkills.take(3).joinToString(" и ")}"
        }
        if (matchedSkills.size >= 2) {
            score += 5
        }
        score += when (opportunity.type) {
            OpportunityType.VACANCY, OpportunityType.INTERNSHIP ->
                if (matchedSkills.isNotEmpty()) (10 * interestRatio).roundToInt() else 0
            OpportunityType.MENTORING, OpportunityType.EVENT -> (15 * interestRatio).roundToInt()
        }
        if (matchedInterests.isNotEmpty()) {
            reasons += "Совпало направление ${matchedInterests.take(2).joinToString(" и ")}"
        }

        when (opportunity.workFormat) {
            WorkFormat.REMOTE, WorkFormat.ONLINE -> {
                score += 4
                reasons += "Формат удалённый — можно откликнуться из любого города"
            }
            WorkFormat.OFFICE, WorkFormat.HYBRID -> if (applicant.cityId != null && applicant.cityId == resolveCityId(opportunity)) {
                score += 10
                reasons += "Город совпадает с твоим профилем"
            }
        }

        when (opportunity.grade) {
            Grade.INTERN, Grade.JUNIOR -> {
                score += 8
                reasons += "Подходит для junior-уровня"
            }
            Grade.MIDDLE -> score += 2
            Grade.SENIOR, null -> Unit
        }

        if (isFavorite) {
            score += 10
            reasons += "Ты добавил эту возможность в избранное"
        }
        if (opportunity.publishedAt?.isAfter(now.minusDays(14)) == true) {
            score += 3
        }

        val boundedScore = score.coerceAtMost(100)
        return OpportunityRecommendationScore(
            score = boundedScore,
            matchLevel = when {
                boundedScore >= 75 -> RecommendationMatchLevel.HIGH
                boundedScore >= 45 -> RecommendationMatchLevel.MEDIUM
                else -> RecommendationMatchLevel.LOW
            },
            matchedSkills = matchedSkills,
            matchedInterests = matchedInterests,
            missingSkills = missingSkills,
            reasons = reasons.take(properties.maxReasons.coerceAtLeast(0)),
            improvementTips = tips.take(properties.maxImprovementTips.coerceAtLeast(0)),
            isFavorite = isFavorite,
            isEligible = true,
        )
    }

    private fun resolveCityId(opportunity: OpportunityDto): Long? {
        return opportunity.cityId ?: opportunity.location?.cityId
    }
}

data class OpportunityRecommendationScore(
    val score: Int,
    val matchLevel: RecommendationMatchLevel,
    val matchedSkills: List<String>,
    val matchedInterests: List<String>,
    val missingSkills: List<String>,
    val reasons: List<String>,
    val improvementTips: List<String>,
    val isFavorite: Boolean,
    val isEligible: Boolean,
)
