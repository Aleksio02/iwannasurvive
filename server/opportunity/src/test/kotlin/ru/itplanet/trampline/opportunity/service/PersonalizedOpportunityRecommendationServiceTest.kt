package ru.itplanet.trampline.opportunity.service

import org.junit.jupiter.api.Test
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.model.RecommendationMatchKind
import ru.itplanet.trampline.opportunity.model.RecommendationMatchLevel
import java.time.OffsetDateTime
import kotlin.test.assertEquals

class PersonalizedOpportunityRecommendationServiceTest {

    @Test
    fun `qualified recommendations include partial above min score and exclude non eligible`() {
        val partial = opportunity(1, OffsetDateTime.parse("2026-06-01T12:00:00Z")) to score(
            value = 69,
            isEligible = true,
            matchKind = RecommendationMatchKind.PARTIAL_SKILL_MATCH,
        )
        val nonEligible = opportunity(2, OffsetDateTime.parse("2026-06-02T12:00:00Z")) to score(
            value = 90,
            isEligible = false,
            matchKind = RecommendationMatchKind.NONE,
        )
        val tooLow = opportunity(3, OffsetDateTime.parse("2026-06-03T12:00:00Z")) to score(
            value = 54,
            isEligible = true,
            matchKind = RecommendationMatchKind.PARTIAL_SKILL_MATCH,
        )

        val qualified = qualifyPersonalizedRecommendations(
            scored = listOf(nonEligible, tooLow, partial),
            minScore = 55,
        )

        assertEquals(listOf(1L), qualified.map { checkNotNull(it.first.id) })
    }

    @Test
    fun `qualified recommendations sort by score favorite strong match and published date`() {
        val regular = opportunity(1, OffsetDateTime.parse("2026-06-03T12:00:00Z")) to score(
            value = 70,
            isFavorite = false,
            matchKind = RecommendationMatchKind.PARTIAL_SKILL_MATCH,
        )
        val favorite = opportunity(2, OffsetDateTime.parse("2026-06-01T12:00:00Z")) to score(
            value = 70,
            isFavorite = true,
            matchKind = RecommendationMatchKind.PARTIAL_SKILL_MATCH,
        )
        val strong = opportunity(3, OffsetDateTime.parse("2026-06-02T12:00:00Z")) to score(
            value = 70,
            isFavorite = false,
            matchKind = RecommendationMatchKind.STRONG_SKILL_MATCH,
        )
        val higherScore = opportunity(4, OffsetDateTime.parse("2026-05-01T12:00:00Z")) to score(
            value = 80,
            matchKind = RecommendationMatchKind.PARTIAL_SKILL_MATCH,
        )

        val qualified = qualifyPersonalizedRecommendations(
            scored = listOf(regular, strong, favorite, higherScore),
            minScore = 55,
        )

        assertEquals(listOf(4L, 2L, 3L, 1L), qualified.map { checkNotNull(it.first.id) })
    }

    private fun opportunity(id: Long, publishedAt: OffsetDateTime) = OpportunityDto().apply {
        this.id = id
        this.publishedAt = publishedAt
    }

    private fun score(
        value: Int,
        isEligible: Boolean = true,
        isFavorite: Boolean = false,
        matchKind: RecommendationMatchKind,
    ) = OpportunityRecommendationScore(
        score = value,
        matchLevel = RecommendationMatchLevel.MEDIUM,
        matchedSkills = emptyList(),
        matchedInterests = emptyList(),
        missingSkills = emptyList(),
        reasons = emptyList(),
        improvementTips = emptyList(),
        isFavorite = isFavorite,
        isEligible = isEligible,
        matchKind = matchKind,
    )
}
