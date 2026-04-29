package ru.itplanet.trampline.opportunity.service

import ru.itplanet.trampline.commons.model.opportunity.InternalOpportunityChatContextResponse

interface InternalOpportunityChatContextService {
    fun getChatContext(opportunityId: Long): InternalOpportunityChatContextResponse
}
