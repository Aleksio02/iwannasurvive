package ru.itplanet.trampline.interaction.chat.model.response

import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus
import java.time.OffsetDateTime

data class ChatDialogListItemResponse(
    val dialogId: Long,
    val opportunityResponseId: Long,
    val opportunityId: Long,
    val opportunityTitle: String,
    val companyName: String,
    val counterpart: ChatParticipantSummaryResponse,
    val lastMessagePreview: String?,
    val lastMessageAt: OffsetDateTime?,
    val unreadCount: Long,
    val canSend: Boolean,
    val responseStatus: OpportunityResponseStatus,
    val archived: Boolean,
)
