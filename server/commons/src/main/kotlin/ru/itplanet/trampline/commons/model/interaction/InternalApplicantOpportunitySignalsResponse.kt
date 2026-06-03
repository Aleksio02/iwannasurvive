package ru.itplanet.trampline.commons.model.interaction

data class InternalApplicantOpportunitySignalsResponse(
    val favoriteOpportunityIds: List<Long>,
    val respondedOpportunityIds: List<Long>,
)
