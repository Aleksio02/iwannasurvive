package ru.itplanet.trampline.interaction.chat.ws.model

import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogStatus
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageType
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus
import java.time.OffsetDateTime

enum class ChatEventType {
    MESSAGE_CREATED,
    READ_UPDATED,
    DIALOG_UPDATED,
    DIALOG_CLOSED,
}

data class ChatEventEnvelope(
    val type: ChatEventType,
    val dialogId: Long,
    val occurredAt: OffsetDateTime,
    val payload: Any,
)

data class ChatParticipantSummaryEventPayload(
    val userId: Long,
    val role: Role,
    val displayName: String,
)

data class ChatDialogEventPayload(
    val dialogId: Long,
    val opportunityResponseId: Long,
    val opportunityId: Long,
    val opportunityTitle: String,
    val companyName: String,
    val counterpart: ChatParticipantSummaryEventPayload,
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

data class ChatMessageEventPayload(
    val id: Long,
    val dialogId: Long,
    val senderUserId: Long,
    val senderRole: Role,
    val messageType: ChatMessageType,
    val body: String,
    val clientMessageId: String,
    val createdAt: OffsetDateTime?,
    val editedAt: OffsetDateTime?,
    val deletedAt: OffsetDateTime?,
)

data class ChatReadUpdatedEventPayload(
    val readerUserId: Long,
    val lastReadMessageId: Long,
    val readAt: OffsetDateTime,
)
