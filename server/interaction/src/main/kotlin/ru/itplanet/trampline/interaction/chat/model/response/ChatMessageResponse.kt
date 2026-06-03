package ru.itplanet.trampline.interaction.chat.model.response

import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageType
import java.time.OffsetDateTime

data class ChatMessageResponse(
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
    val reactions: List<ChatMessageReactionResponse> = emptyList(),
    val replyTo: ChatMessageReplyPreviewResponse? = null,
    val forwardedFrom: ChatForwardedMessageResponse? = null,
    val pinned: Boolean = false,
)

data class ChatMessageReactionResponse(
    val reaction: String,
    val count: Long,
    val reactedByMe: Boolean,
)

data class ChatMessageReplyPreviewResponse(
    val id: Long,
    val senderUserId: Long,
    val senderDisplayName: String,
    val bodyPreview: String?,
    val attachmentKind: String?,
    val deleted: Boolean,
)

data class ChatForwardedMessageResponse(
    val messageId: Long?,
    val senderName: String?,
)
