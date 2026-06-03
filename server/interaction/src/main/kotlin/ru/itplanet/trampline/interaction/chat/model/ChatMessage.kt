package ru.itplanet.trampline.interaction.chat.model

import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageType
import java.time.OffsetDateTime

data class ChatMessage(
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
    val attachments: List<ChatAttachment> = emptyList(),
    val reactions: List<ChatMessageReaction> = emptyList(),
    val replyTo: ChatMessageReplyPreview? = null,
    val forwardedFrom: ChatForwardedMessage? = null,
    val pinned: Boolean = false,
)

data class ChatMessageReaction(
    val reaction: String,
    val count: Long,
    val reactedByMe: Boolean,
)

data class ChatMessageReplyPreview(
    val id: Long,
    val senderUserId: Long,
    val senderDisplayName: String,
    val bodyPreview: String?,
    val attachmentKind: String?,
    val deleted: Boolean,
)

data class ChatForwardedMessage(
    val messageId: Long?,
    val senderName: String?,
)
