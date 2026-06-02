package ru.itplanet.trampline.opportunity.service

import org.junit.jupiter.api.Test
import ru.itplanet.trampline.commons.model.Tag
import ru.itplanet.trampline.commons.model.enums.Grade
import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.commons.model.enums.TagCategory
import ru.itplanet.trampline.commons.model.enums.WorkFormat
import ru.itplanet.trampline.commons.model.interaction.InternalApplicantOpportunitySignalsResponse
import ru.itplanet.trampline.commons.model.profile.InternalApplicantRecommendationContextResponse
import ru.itplanet.trampline.opportunity.ai.config.AiRecommendationExplanationProperties
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.model.RecommendationMatchKind
import java.time.OffsetDateTime
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class OpportunityRecommendationScoreCalculatorTest {

    private val properties = AiRecommendationExplanationProperties()
    private val calculator = OpportunityRecommendationScoreCalculator(properties)
    private val now = OffsetDateTime.parse("2026-06-02T12:00:00Z")

    @Test
    fun `vacancy with one of two skills and supporting signals is eligible partial match`() {
        val opportunity = opportunity(
            tags = listOf(tech(1, "Java"), tech(2, "Spring")),
            cityId = 100,
            grade = Grade.JUNIOR,
        )
        val applicant = applicant(skills = listOf(tag(1, "Java")), cityId = 100)

        val score = calculator.calculate(opportunity, applicant, noSignals(), now)

        assertTrue(score.isEligible)
        assertTrue(score.score >= properties.minScore)
        assertEquals(listOf("Java"), score.matchedSkills)
        assertTrue("Spring" in score.missingSkills)
        assertEquals(RecommendationMatchKind.PARTIAL_SKILL_MATCH, score.matchKind)
        assertTrue("Совпал навык Java" in score.reasons)
        assertTrue("Можно подтянуть Spring" in score.improvementTips)
    }

    @Test
    fun `vacancy without skills is not eligible even with same city and junior grade`() {
        val opportunity = opportunity(
            tags = listOf(tech(1, "Java"), tech(2, "Spring")),
            cityId = 100,
            grade = Grade.JUNIOR,
        )
        val applicant = applicant(skills = emptyList(), cityId = 100)

        val score = calculator.calculate(opportunity, applicant, noSignals(), now)

        assertFalse(score.isEligible)
        assertEquals(0, score.score)
    }

    @Test
    fun `vacancy with one of five skills is not eligible`() {
        val opportunity = opportunity(
            tags = listOf(
                tech(1, "Java"),
                tech(2, "Spring"),
                tech(3, "SQL"),
                tech(4, "Docker"),
                tech(5, "Kafka"),
            ),
            cityId = 100,
        )
        val applicant = applicant(skills = listOf(tag(1, "Java")), cityId = 100)

        val score = calculator.calculate(opportunity, applicant, noSignals(), now)

        assertFalse(score.isEligible)
        assertEquals(0, score.score)
    }

    @Test
    fun `vacancy with all required skills is strong and scores higher than partial`() {
        val opportunity = opportunity(
            tags = listOf(tech(1, "Java"), tech(2, "Spring")),
            cityId = 100,
            grade = Grade.JUNIOR,
        )
        val partialApplicant = applicant(skills = listOf(tag(1, "Java")), cityId = 100)
        val strongApplicant = applicant(skills = listOf(tag(1, "Java"), tag(2, "Spring")), cityId = 100)

        val partialScore = calculator.calculate(opportunity, partialApplicant, noSignals(), now)
        val strongScore = calculator.calculate(opportunity, strongApplicant, noSignals(), now)

        assertTrue(strongScore.isEligible)
        assertEquals(RecommendationMatchKind.STRONG_SKILL_MATCH, strongScore.matchKind)
        assertTrue(strongScore.score > partialScore.score)
    }

    @Test
    fun `vacancy with matched interest only is not eligible`() {
        val opportunity = opportunity(tags = listOf(direction(10, "Backend")))
        val applicant = applicant(interests = listOf(tag(10, "Backend", TagCategory.DIRECTION)))

        val score = calculator.calculate(opportunity, applicant, noSignals(), now)

        assertFalse(score.isEligible)
        assertEquals(0, score.score)
    }

    @Test
    fun `mentoring with matched interest is eligible`() {
        val opportunity = opportunity(
            type = OpportunityType.MENTORING,
            tags = listOf(direction(10, "Backend")),
        )
        val applicant = applicant(interests = listOf(tag(10, "Backend", TagCategory.DIRECTION)))

        val score = calculator.calculate(opportunity, applicant, noSignals(), now)

        assertTrue(score.isEligible)
        assertEquals(RecommendationMatchKind.INTEREST_MATCH, score.matchKind)
    }

    @Test
    fun `event with matched interest is not eligible when applicant is not open to events`() {
        val opportunity = opportunity(
            type = OpportunityType.EVENT,
            tags = listOf(direction(10, "Backend")),
        )
        val applicant = applicant(
            interests = listOf(tag(10, "Backend", TagCategory.DIRECTION)),
            openToEvents = false,
        )

        val score = calculator.calculate(opportunity, applicant, noSignals(), now)

        assertFalse(score.isEligible)
        assertEquals(0, score.score)
    }

    @Test
    fun `favorite opportunity without skills is eligible favorite match`() {
        val opportunity = opportunity(id = 77, tags = listOf(tech(1, "Java")))
        val applicant = applicant(skills = emptyList())
        val signals = InternalApplicantOpportunitySignalsResponse(
            favoriteOpportunityIds = listOf(77),
            respondedOpportunityIds = emptyList(),
        )

        val score = calculator.calculate(opportunity, applicant, signals, now)

        assertTrue(score.isEligible)
        assertEquals(RecommendationMatchKind.FAVORITE, score.matchKind)
    }

    private fun applicant(
        skills: List<Tag> = emptyList(),
        interests: List<Tag> = emptyList(),
        cityId: Long? = null,
        openToWork: Boolean = true,
        openToEvents: Boolean = true,
    ) = InternalApplicantRecommendationContextResponse(
        userId = 1,
        cityId = cityId,
        cityName = null,
        course = null,
        graduationYear = null,
        openToWork = openToWork,
        openToEvents = openToEvents,
        skills = skills,
        interests = interests,
    )

    private fun opportunity(
        id: Long = 1,
        type: OpportunityType = OpportunityType.VACANCY,
        tags: List<TagDto> = emptyList(),
        cityId: Long? = null,
        workFormat: WorkFormat = WorkFormat.OFFICE,
        grade: Grade? = null,
    ) = OpportunityDto().apply {
        this.id = id
        this.title = "Java developer"
        this.companyName = "Company"
        this.type = type
        this.workFormat = workFormat
        this.grade = grade
        this.cityId = cityId
        this.publishedAt = now.minusDays(1)
        this.tags = tags.toMutableSet()
    }

    private fun tech(id: Long, name: String) = tagDto(id, name, TagCategory.TECH)

    private fun direction(id: Long, name: String) = tagDto(id, name, TagCategory.DIRECTION)

    private fun tagDto(id: Long, name: String, category: TagCategory) = TagDto().apply {
        this.id = id
        this.name = name
        this.normalizedName = name.lowercase()
        this.category = category
    }

    private fun tag(id: Long, name: String, category: TagCategory = TagCategory.TECH) = Tag(
        id = id,
        name = name,
        category = category,
    )

    private fun noSignals() = InternalApplicantOpportunitySignalsResponse(
        favoriteOpportunityIds = emptyList(),
        respondedOpportunityIds = emptyList(),
    )
}
