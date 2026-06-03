package ru.itplanet.trampline.interaction.chat.ws.model

import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogStatus
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageType
import ru.itplanet.trampline.interaction.chat.model.response.ChatAttachmentResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatPinnedMessageResponse
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus
import java.time.OffsetDateTime

enum class ChatEventType {
    MESSAGE_CREATED,
    MESSAGE_UPDATED,
    MESSAGE_DELETED,
    MESSAGE_HIDDEN,
    MESSAGE_REACTIONS_UPDATED,
    MESSAGE_PINNED,
    MESSAGE_UNPINNED,
    READ_UPDATED,
    READ_STATE_UPDATED,
    DIALOG_UPDATED,
    DIALOG_CLOSED,
    TYPING_UPDATED,
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
    val pinnedMessage: ChatPinnedMessageResponse? = null,
)

data class ChatMessageEventPayload(
    val id: Long,
    val dialogId: Long,
    val senderUserId: Long,
    val senderRole: Role,
    val messageType: ChatMessageType,
    val body: String?,
    val clientMessageId: String,
    val createdAt: OffsetDateTime?,
    val editedAt: OffsetDateTime?,
    val deletedAt: OffsetDateTime?,
    val attachments: List<ChatAttachmentResponse> = emptyList(),
    val reactions: List<ru.itplanet.trampline.interaction.chat.model.response.ChatMessageReactionResponse> = emptyList(),
    val replyTo: ru.itplanet.trampline.interaction.chat.model.response.ChatMessageReplyPreviewResponse? = null,
    val forwardedFrom: ru.itplanet.trampline.interaction.chat.model.response.ChatForwardedMessageResponse? = null,
    val pinned: Boolean = false,
)

data class ChatReadUpdatedEventPayload(
    val readerUserId: Long,
    val lastReadMessageId: Long?,
    val readAt: OffsetDateTime,
)

data class ChatMessageHiddenEventPayload(
    val messageId: Long,
)

data class ChatTypingUpdatedEventPayload(
    val userId: Long,
    val typing: Boolean,
    val expiresAt: OffsetDateTime,
)
