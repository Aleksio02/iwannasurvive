package ru.itplanet.trampline.commons.model.opportunity

import ru.itplanet.trampline.commons.model.enums.OpportunityStatus

data class InternalOpportunityChatContextResponse(
    val opportunityId: Long,
    val employerUserId: Long,
    val title: String,
    val companyName: String,
    val status: OpportunityStatus,
)
