package ru.itplanet.trampline.interaction.model.response

import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus
import java.time.OffsetDateTime

data class OpportunityResponseResponse(
    val id: Long,
    val opportunityId: Long,
    val applicantUserId: Long,
    val opportunityTitle: String?,
    val status: OpportunityResponseStatus,
    val employerComment: String?,
    val applicantComment: String?,
    val coverLetter: String?,
    val resumeFileId: Long?,
    val createdAt: OffsetDateTime?,
    val chatSummary: ChatSummaryResponse = ChatSummaryResponse.noChat(),
)
