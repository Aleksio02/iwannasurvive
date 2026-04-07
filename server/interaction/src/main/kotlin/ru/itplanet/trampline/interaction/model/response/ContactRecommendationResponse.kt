package ru.itplanet.trampline.interaction.model.response

import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.interaction.dao.dto.ContactRecommendationStatus
import java.time.OffsetDateTime

data class ContactRecommendationResponse(
    val id: Long,
    val opportunityId: Long,
    val opportunityTitle: String,
    val opportunityType: OpportunityType,
    val companyName: String,
    val fromApplicantUserId: Long,
    val fromApplicantName: String,
    val toApplicantUserId: Long,
    val toApplicantName: String,
    val message: String?,
    val status: ContactRecommendationStatus,
    val viewedAt: OffsetDateTime?,
    val respondedAt: OffsetDateTime?,
    val createdAt: OffsetDateTime?,
)
