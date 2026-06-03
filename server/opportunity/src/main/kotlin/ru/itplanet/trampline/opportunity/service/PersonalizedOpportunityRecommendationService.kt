package ru.itplanet.trampline.opportunity.service

import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.interaction.InternalApplicantOpportunitySignalsResponse
import ru.itplanet.trampline.opportunity.ai.config.AiRecommendationExplanationProperties
import ru.itplanet.trampline.opportunity.ai.model.AiRecommendationExplanationInput
import ru.itplanet.trampline.opportunity.ai.service.AiRecommendationExplanationService
import ru.itplanet.trampline.opportunity.client.InteractionServiceClient
import ru.itplanet.trampline.opportunity.client.ProfileServiceClient
import ru.itplanet.trampline.opportunity.converter.OpportunityConverter
import ru.itplanet.trampline.opportunity.dao.OpportunityDao
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.dao.specification.OpportunitySpecification
import ru.itplanet.trampline.opportunity.model.PersonalizedOpportunityRecommendationItem
import ru.itplanet.trampline.opportunity.model.PersonalizedOpportunityRecommendationPage
import ru.itplanet.trampline.opportunity.model.PersonalizedRecommendationExplanation
import ru.itplanet.trampline.opportunity.model.RecommendationEmptyReason
import ru.itplanet.trampline.opportunity.model.RecommendationExplanationSource
import ru.itplanet.trampline.opportunity.model.RecommendationMatchKind
import ru.itplanet.trampline.opportunity.model.RecommendationProfileHints
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Service
class PersonalizedOpportunityRecommendationService(
    private val properties: AiRecommendationExplanationProperties,
    private val profileServiceClient: ProfileServiceClient,
    private val interactionServiceClient: InteractionServiceClient,
    private val opportunityDao: OpportunityDao,
    private val opportunityConverter: OpportunityConverter,
    private val scoreCalculator: OpportunityRecommendationScoreCalculator,
    private val explanationService: AiRecommendationExplanationService,
) {
    @Transactional(readOnly = true)
    fun getRecommendations(userId: Long, requestedLimit: Int): PersonalizedOpportunityRecommendationPage {
        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val limit = requestedLimit.coerceAtMost(properties.maxRecommendations.coerceAtLeast(1))
        val applicant = profileServiceClient.getApplicantRecommendationContext(userId)
        val signals = loadSignals(userId)
        val profileHints = RecommendationProfileHints(
            hasSkills = applicant.skills.isNotEmpty(),
            hasInterests = applicant.interests.isNotEmpty(),
            hasCity = applicant.cityId != null || !applicant.cityName.isNullOrBlank(),
        )
        if (applicant.skills.isEmpty() && applicant.interests.isEmpty() && signals.favoriteOpportunityIds.isEmpty()) {
            return PersonalizedOpportunityRecommendationPage(
                items = emptyList(),
                limit = limit,
                totalCandidates = 0,
                generatedAt = now,
                emptyReason = RecommendationEmptyReason.PROFILE_SIGNALS_MISSING,
                profileHints = profileHints,
            )
        }
        val candidates = opportunityDao.findAll(
            OpportunitySpecification.recommendationCandidates(now),
            PageRequest.of(
                0,
                properties.maxCandidates.coerceAtLeast(1),
                Sort.by(Sort.Direction.DESC, "publishedAt"),
            ),
        ).content.filterNot { checkNotNull(it.id) in signals.respondedOpportunityIds }
        if (candidates.isEmpty()) {
            return PersonalizedOpportunityRecommendationPage(
                items = emptyList(),
                limit = limit,
                totalCandidates = 0,
                generatedAt = now,
                emptyReason = RecommendationEmptyReason.NO_ACTIVE_CANDIDATES,
                profileHints = profileHints,
            )
        }

        val scored = candidates.map { opportunity ->
            opportunity to scoreCalculator.calculate(opportunity, applicant, signals, now)
        }

        val qualified = qualifyPersonalizedRecommendations(scored, properties.minScore)

        val items = qualified.take(limit).map { (opportunity, score) ->
                val fallback = PersonalizedRecommendationExplanation(
                    source = RecommendationExplanationSource.RULES,
                    summary = rulesSummary(score),
                    whyFits = score.reasons,
                    whatToImprove = score.improvementTips,
                )
                PersonalizedOpportunityRecommendationItem(
                    opportunity = opportunityConverter.toListItem(opportunity),
                    score = score.score,
                    matchLevel = score.matchLevel,
                    matchedSkills = score.matchedSkills,
                    matchedInterests = score.matchedInterests,
                    missingSkills = score.missingSkills,
                    reasons = score.reasons,
                    improvementTips = score.improvementTips,
                    explanation = explanationService.explain(
                        input = AiRecommendationExplanationInput(
                            applicantSkills = applicant.skills.map { it.name },
                            applicantInterests = applicant.interests.map { it.name },
                            applicantCityName = applicant.cityName,
                            openToWork = applicant.openToWork,
                            openToEvents = applicant.openToEvents,
                            opportunityTitle = opportunity.title,
                            companyName = opportunity.companyName,
                            opportunityType = opportunity.type.name,
                            workFormat = opportunity.workFormat.name,
                            grade = opportunity.grade?.name,
                            opportunityTags = opportunity.tags.map { it.name },
                            score = score.score,
                            matchedSkills = score.matchedSkills,
                            matchedInterests = score.matchedInterests,
                            missingSkills = score.missingSkills,
                            reasons = score.reasons,
                            improvementTips = score.improvementTips,
                        ),
                        fallback = fallback,
                    ),
                    isFavorite = score.isFavorite,
                )
            }

        return PersonalizedOpportunityRecommendationPage(
            items = items,
            limit = limit,
            totalCandidates = candidates.size,
            generatedAt = now,
            emptyReason = if (items.isEmpty()) RecommendationEmptyReason.NO_ELIGIBLE_MATCHES else null,
            profileHints = profileHints,
        )
    }

    private fun loadSignals(userId: Long): InternalApplicantOpportunitySignalsResponse {
        return try {
            interactionServiceClient.getApplicantOpportunitySignals(userId)
        } catch (exception: Exception) {
            logger.warn("Failed to load applicant opportunity signals: {}", exception.javaClass.simpleName)
            InternalApplicantOpportunitySignalsResponse(emptyList(), emptyList())
        }
    }

    private fun rulesSummary(score: OpportunityRecommendationScore): String {
        return when {
            score.matchedSkills.isNotEmpty() -> "Подходит по навыкам и данным твоего профиля."
            score.matchedInterests.isNotEmpty() -> "Подходит по интересам и данным твоего профиля."
            score.reasons.isNotEmpty() -> "Может подойти по данным твоего профиля."
            else -> "Обрати внимание на эту возможность."
        }
    }

    private companion object {
        val logger = LoggerFactory.getLogger(PersonalizedOpportunityRecommendationService::class.java)
    }
}

internal fun qualifyPersonalizedRecommendations(
    scored: List<Pair<OpportunityDto, OpportunityRecommendationScore>>,
    minScore: Int,
): List<Pair<OpportunityDto, OpportunityRecommendationScore>> {
    return scored
        .filter { (_, score) -> score.isEligible }
        .filter { (_, score) -> score.score >= minScore.coerceAtLeast(0) }
        .sortedWith(
            compareByDescending<Pair<OpportunityDto, OpportunityRecommendationScore>> { it.second.score }
                .thenByDescending { it.second.isFavorite }
                .thenByDescending { it.second.matchKind == RecommendationMatchKind.STRONG_SKILL_MATCH }
                .thenByDescending { it.first.publishedAt },
        )
}
