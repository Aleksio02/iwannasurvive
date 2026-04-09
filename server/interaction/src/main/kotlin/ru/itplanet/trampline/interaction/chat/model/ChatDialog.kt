package ru.itplanet.trampline.interaction.chat.model

import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogStatus
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus
import java.time.OffsetDateTime

data class ChatDialog(
    val dialogId: Long,
    val opportunityResponseId: Long,
    val opportunityId: Long,
    val opportunityTitle: String,
    val companyName: String,
    val counterpart: ChatParticipantSummary,
    val status: ChatDialogStatus,
    val responseStatus: OpportunityResponseStatus,
    val lastMessagePreview: String?,
    val lastMessageAt: OffsetDateTime?,
    val unreadCount: Long,
    val canSend: Boolean,
    val archived: Boolean,
    val createdAt: OffsetDateTime?,
    val updatedAt: OffsetDateTime?,
)
