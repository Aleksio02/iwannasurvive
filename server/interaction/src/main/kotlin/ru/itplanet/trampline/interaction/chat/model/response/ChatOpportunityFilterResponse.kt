package ru.itplanet.trampline.interaction.chat.model.response

data class ChatOpportunityFilterResponse(
    val opportunityId: Long,
    val opportunityTitle: String,
    val companyName: String,
    val dialogsCount: Long,
    val unreadCount: Long,
)
