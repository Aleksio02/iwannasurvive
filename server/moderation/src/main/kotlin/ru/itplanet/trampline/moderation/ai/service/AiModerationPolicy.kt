package ru.itplanet.trampline.moderation.ai.service

import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.moderation.ai.config.AiModerationProperties

@Component
class AiModerationPolicy(private val properties: AiModerationProperties) {
    fun isEnabled(): Boolean = properties.enabled

    fun isSupported(entityType: ModerationEntityType, taskType: ModerationTaskType): Boolean =
        when (entityType to taskType) {
            ModerationEntityType.OPPORTUNITY to ModerationTaskType.OPPORTUNITY_REVIEW ->
                properties.supported.opportunityReview
            ModerationEntityType.APPLICANT_PROFILE to ModerationTaskType.PROFILE_REVIEW ->
                properties.supported.applicantProfileReview
            ModerationEntityType.EMPLOYER_PROFILE to ModerationTaskType.PROFILE_REVIEW ->
                properties.supported.employerProfileReview
            ModerationEntityType.EMPLOYER_VERIFICATION to ModerationTaskType.VERIFICATION_REVIEW ->
                properties.supported.employerVerificationReview
            ModerationEntityType.TAG to ModerationTaskType.TAG_REVIEW ->
                properties.supported.tagReview
            else -> false
        }
}
