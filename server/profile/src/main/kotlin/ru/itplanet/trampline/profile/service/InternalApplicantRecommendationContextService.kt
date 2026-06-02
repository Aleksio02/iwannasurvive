package ru.itplanet.trampline.profile.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.Tag
import ru.itplanet.trampline.commons.model.profile.InternalApplicantRecommendationContextResponse
import ru.itplanet.trampline.profile.client.OpportunityTagClient
import ru.itplanet.trampline.profile.dao.ApplicantProfileDao
import ru.itplanet.trampline.profile.dao.ApplicantTagDao
import ru.itplanet.trampline.profile.exception.ProfileNotFoundException
import ru.itplanet.trampline.profile.model.enums.ApplicantTagRelationType

@Service
class InternalApplicantRecommendationContextService(
    private val applicantProfileDao: ApplicantProfileDao,
    private val applicantTagDao: ApplicantTagDao,
    private val opportunityTagClient: OpportunityTagClient,
) {
    @Transactional(readOnly = true)
    fun getContext(userId: Long): InternalApplicantRecommendationContextResponse {
        val profile = applicantProfileDao.findById(userId)
            .orElseThrow { ProfileNotFoundException("Профиль соискателя не найден") }
        val relations = applicantTagDao.findAllByApplicantUserId(userId)
        val tagsById = loadTags(relations.map { it.tagId })

        fun tags(type: ApplicantTagRelationType): List<Tag> = relations.asSequence()
            .filter { it.relationType == type }
            .mapNotNull { tagsById[it.tagId] }
            .distinctBy(Tag::id)
            .sortedBy { it.name.lowercase() }
            .toList()

        return InternalApplicantRecommendationContextResponse(
            userId = profile.userId,
            cityId = profile.city?.id,
            cityName = profile.city?.name,
            course = profile.course,
            graduationYear = profile.graduationYear,
            openToWork = profile.openToWork,
            openToEvents = profile.openToEvents,
            skills = tags(ApplicantTagRelationType.SKILL),
            interests = tags(ApplicantTagRelationType.INTEREST),
        )
    }

    private fun loadTags(tagIds: List<Long>): Map<Long, Tag> {
        if (tagIds.isEmpty()) return emptyMap()
        return opportunityTagClient.getActiveTagsByIds(tagIds.distinct()).associateBy(Tag::id)
    }
}
