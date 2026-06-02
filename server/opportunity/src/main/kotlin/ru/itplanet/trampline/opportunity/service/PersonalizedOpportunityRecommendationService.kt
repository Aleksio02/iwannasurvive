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
import ru.itplanet.trampline.opportunity.model.RecommendationExplanationSource
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
        val candidates = opportunityDao.findAll(
            OpportunitySpecification.recommendationCandidates(now),
            PageRequest.of(
                0,
                properties.maxCandidates.coerceAtLeast(1),
                Sort.by(Sort.Direction.DESC, "publishedAt"),
            ),
        ).content.filterNot { checkNotNull(it.id) in signals.respondedOpportunityIds }

        val scored = candidates.map { opportunity ->
            opportunity to scoreCalculator.calculate(opportunity, applicant, signals, now)
        }.sortedWith(
            compareByDescending<Pair<OpportunityDto, OpportunityRecommendationScore>> { it.second.score }
                .thenByDescending { it.first.publishedAt },
        )

        return PersonalizedOpportunityRecommendationPage(
            items = scored.take(limit).map { (opportunity, score) ->
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
                    missingSkills = score.missingSkills,
                    reasons = score.reasons,
                    improvementTips = score.improvementTips,
                    explanation = explanationService.explain(
                        input = AiRecommendationExplanationInput(
                            applicantSkills = applicant.skills.map { it.name },
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
                            missingSkills = score.missingSkills,
                            reasons = score.reasons,
                            improvementTips = score.improvementTips,
                        ),
                        fallback = fallback,
                    ),
                    isFavorite = score.isFavorite,
                )
            },
            limit = limit,
            totalCandidates = candidates.size,
            generatedAt = now,
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
            score.reasons.isNotEmpty() -> "Может подойти по данным твоего профиля."
            else -> "Обрати внимание на эту возможность."
        }
    }

    private companion object {
        val logger = LoggerFactory.getLogger(PersonalizedOpportunityRecommendationService::class.java)
    }
}
