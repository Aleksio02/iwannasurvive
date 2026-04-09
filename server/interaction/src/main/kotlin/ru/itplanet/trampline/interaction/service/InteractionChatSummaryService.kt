package ru.itplanet.trampline.interaction.service

import ru.itplanet.trampline.interaction.model.response.EmployerOpportunityResponseItem
import ru.itplanet.trampline.interaction.model.response.EmployerResponsePage
import ru.itplanet.trampline.interaction.model.response.OpportunityResponseResponse

interface InteractionChatSummaryService {
    fun enrichApplicantResponses(
        currentUserId: Long,
        responses: List<OpportunityResponseResponse>,
    ): List<OpportunityResponseResponse>

    fun enrichEmployerResponses(
        currentUserId: Long,
        page: EmployerResponsePage<EmployerOpportunityResponseItem>,
    ): EmployerResponsePage<EmployerOpportunityResponseItem>
}
