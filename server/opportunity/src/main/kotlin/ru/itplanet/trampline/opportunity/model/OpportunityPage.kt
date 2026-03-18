package ru.itplanet.trampline.opportunity.model

data class OpportunityPage<T>(
    val items: List<T>,
    val limit: Int,
    val offset: Long,
    val total: Long
)
