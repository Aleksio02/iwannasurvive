package ru.itplanet.trampline.opportunity.service

import ru.itplanet.trampline.opportunity.model.EmployerOpportunityCard
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityListItem
import ru.itplanet.trampline.opportunity.model.OpportunityPage
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerOpportunityRequest
import ru.itplanet.trampline.opportunity.model.request.GetEmployerOpportunityListRequest

interface EmployerOpportunityService {

    fun create(
        currentUserId: Long,
        request: CreateEmployerOpportunityRequest
    ): EmployerOpportunityCard

    fun getMyOpportunities(
        currentUserId: Long,
        request: GetEmployerOpportunityListRequest
    ): OpportunityPage<EmployerOpportunityListItem>
}
