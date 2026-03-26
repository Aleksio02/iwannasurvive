package ru.itplanet.trampline.interaction.model.response

import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus
import java.time.OffsetDateTime

data class OpportunityResponseResponse(
    val id: Long,
    val opportunityId: Long,
    val opportunityTitle: String?,
    val status: OpportunityResponseStatus,
    val comment: String?,
    val createdAt: OffsetDateTime?
)