package ru.itplanet.trampline.interaction.model.request

data class OpportunityResponseRequest (
    val opportunityId: Long,
    val comment: String? = null
)