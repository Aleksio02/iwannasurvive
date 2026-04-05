package ru.itplanet.trampline.interaction.chat.dao

import ru.itplanet.trampline.interaction.chat.model.ChatResponseSummary

interface ChatResponseSummaryQueryDao {
    fun findByOpportunityResponseIds(
        currentUserId: Long,
        opportunityResponseIds: Collection<Long>,
    ): Map<Long, ChatResponseSummary>
}
