package ru.itplanet.trampline.opportunity.model.request

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import ru.itplanet.trampline.opportunity.model.enums.EmployerOpportunityCabinetGroup
import ru.itplanet.trampline.opportunity.model.enums.EmployerOpportunitySortBy
import ru.itplanet.trampline.opportunity.model.enums.OpportunityStatus
import ru.itplanet.trampline.opportunity.model.enums.OpportunityType
import ru.itplanet.trampline.opportunity.model.enums.SortDirection
import ru.itplanet.trampline.opportunity.model.enums.WorkFormat

data class GetEmployerOpportunityListRequest(
    @field:Min(1)
    @field:Max(100)
    val limit: Int = 20,

    @field:Min(0)
    val offset: Long = 0,

    val sortBy: EmployerOpportunitySortBy = EmployerOpportunitySortBy.UPDATED_AT,
    val sortDirection: SortDirection = SortDirection.DESC,

    val status: OpportunityStatus? = null,
    val group: EmployerOpportunityCabinetGroup? = null,

    val type: OpportunityType? = null,
    val workFormat: WorkFormat? = null,

    val search: String? = null
)
