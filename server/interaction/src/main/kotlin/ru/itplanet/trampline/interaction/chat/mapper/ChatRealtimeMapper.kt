package ru.itplanet.trampline.interaction.chat.mapper

import org.springframework.stereotype.Component
import ru.itplanet.trampline.interaction.chat.model.ChatDialog
import ru.itplanet.trampline.interaction.chat.model.ChatMessage
import ru.itplanet.trampline.interaction.chat.model.ChatParticipantSummary
import ru.itplanet.trampline.interaction.chat.ws.model.ChatDialogEventPayload
import ru.itplanet.trampline.interaction.chat.ws.model.ChatParticipantSummaryEventPayload
import ru.itplanet.trampline.interaction.chat.ws.model.ChatReadUpdatedEventPayload
import ru.itplanet.trampline.interaction.chat.ws.model.ChatEventEnvelope
import ru.itplanet.trampline.interaction.chat.ws.model.ChatEventType
import ru.itplanet.trampline.interaction.chat.ws.model.ChatMessageEventPayload
import ru.itplanet.trampline.interaction.chat.model.response.ChatAttachmentResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatForwardedMessageResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatMessageReactionResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatMessageReplyPreviewResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatPinnedMessageResponse
import ru.itplanet.trampline.interaction.chat.ws.model.ChatMessageHiddenEventPayload
import ru.itplanet.trampline.interaction.chat.ws.model.ChatTypingUpdatedEventPayload
import java.time.OffsetDateTime

@Component
class ChatRealtimeMapper {

    fun toMessageCreatedEvent(
        message: ChatMessage,
    ): ChatEventEnvelope = toMessageEvent(ChatEventType.MESSAGE_CREATED, message)

    fun toMessageUpdatedEvent(
        message: ChatMessage,
    ): ChatEventEnvelope = toMessageEvent(ChatEventType.MESSAGE_UPDATED, message)

    fun toMessageDeletedEvent(
        message: ChatMessage,
    ): ChatEventEnvelope = toMessageEvent(ChatEventType.MESSAGE_DELETED, message)

    fun toMessageReactionsUpdatedEvent(
        message: ChatMessage,
    ): ChatEventEnvelope = toMessageEvent(ChatEventType.MESSAGE_REACTIONS_UPDATED, message)

    private fun toMessageEvent(
        type: ChatEventType,
        message: ChatMessage,
    ): ChatEventEnvelope {
        val deleted = message.deletedAt != null
        return ChatEventEnvelope(
            type = type,
            dialogId = message.dialogId,
            occurredAt = message.createdAt ?: OffsetDateTime.now(),
            payload = ChatMessageEventPayload(
                id = message.id,
                dialogId = message.dialogId,
                senderUserId = message.senderUserId,
                senderRole = message.senderRole,
                messageType = message.messageType,
                body = if (deleted) null else message.body,
                clientMessageId = message.clientMessageId,
                createdAt = message.createdAt,
                editedAt = message.editedAt,
                deletedAt = message.deletedAt,
                attachments = if (deleted) emptyList() else message.attachments.map {
                    ChatAttachmentResponse(
                        id = it.id,
                        fileId = it.fileId,
                        originalFileName = it.originalFileName,
                        mediaType = it.mediaType,
                        sizeBytes = it.sizeBytes,
                        attachmentKind = it.attachmentKind,
                    )
                },
                reactions = message.reactions.map {
                    ChatMessageReactionResponse(it.reaction, it.count, it.reactedByMe)
                },
                replyTo = message.replyTo?.let {
                    ChatMessageReplyPreviewResponse(
                        id = it.id,
                        senderUserId = it.senderUserId,
                        senderDisplayName = it.senderDisplayName,
                        bodyPreview = it.bodyPreview,
                        attachmentKind = it.attachmentKind,
                        deleted = it.deleted,
                    )
                },
                forwardedFrom = message.forwardedFrom?.let {
                    ChatForwardedMessageResponse(
                        messageId = it.messageId,
                        senderName = it.senderName,
                    )
                },
                pinned = message.pinned,
            ),
        )
    }

    fun toDialogUpdatedEvent(
        dialog: ChatDialog,
    ): ChatEventEnvelope {
        return ChatEventEnvelope(
            type = ChatEventType.DIALOG_UPDATED,
            dialogId = dialog.dialogId,
            occurredAt = dialog.updatedAt ?: dialog.lastMessageAt ?: dialog.createdAt ?: OffsetDateTime.now(),
            payload = ChatDialogEventPayload(
                dialogId = dialog.dialogId,
                opportunityResponseId = dialog.opportunityResponseId,
                opportunityId = dialog.opportunityId,
                opportunityTitle = dialog.opportunityTitle,
                companyName = dialog.companyName,
                counterpart = toParticipantPayload(dialog.counterpart),
                status = dialog.status,
                responseStatus = dialog.responseStatus,
                lastMessagePreview = dialog.lastMessagePreview,
                lastMessageAt = dialog.lastMessageAt,
                unreadCount = dialog.unreadCount,
                canSend = dialog.canSend,
                archived = dialog.archived,
                createdAt = dialog.createdAt,
                updatedAt = dialog.updatedAt,
                pinnedMessage = dialog.pinnedMessage?.let {
                    ChatPinnedMessageResponse(
                        messageId = it.messageId,
                        pinnedByUserId = it.pinnedByUserId,
                        pinnedAt = it.pinnedAt,
                        preview = it.preview,
                    )
                },
            ),
        )
    }

    fun toReadUpdatedEvent(
        dialogId: Long,
        readerUserId: Long,
        lastReadMessageId: Long?,
        readAt: OffsetDateTime,
    ): ChatEventEnvelope {
        return ChatEventEnvelope(
            type = ChatEventType.READ_UPDATED,
            dialogId = dialogId,
            occurredAt = readAt,
            payload = ChatReadUpdatedEventPayload(
                readerUserId = readerUserId,
                lastReadMessageId = lastReadMessageId,
                readAt = readAt,
            ),
        )
    }

    fun toMessageHiddenEvent(
        dialogId: Long,
        messageId: Long,
    ): ChatEventEnvelope {
        return ChatEventEnvelope(
            type = ChatEventType.MESSAGE_HIDDEN,
            dialogId = dialogId,
            occurredAt = OffsetDateTime.now(),
            payload = ChatMessageHiddenEventPayload(messageId = messageId),
        )
    }

    fun toReadStateUpdatedEvent(
        dialogId: Long,
        readerUserId: Long,
        lastReadMessageId: Long?,
        readAt: OffsetDateTime,
    ): ChatEventEnvelope {
        return ChatEventEnvelope(
            type = ChatEventType.READ_STATE_UPDATED,
            dialogId = dialogId,
            occurredAt = readAt,
            payload = ChatReadUpdatedEventPayload(
                readerUserId = readerUserId,
                lastReadMessageId = lastReadMessageId,
                readAt = readAt,
            ),
        )
    }

    fun toTypingUpdatedEvent(
        dialogId: Long,
        userId: Long,
        typing: Boolean,
        expiresAt: OffsetDateTime,
    ): ChatEventEnvelope {
        return ChatEventEnvelope(
            type = ChatEventType.TYPING_UPDATED,
            dialogId = dialogId,
            occurredAt = OffsetDateTime.now(),
            payload = ChatTypingUpdatedEventPayload(
                userId = userId,
                typing = typing,
                expiresAt = expiresAt,
            ),
        )
    }

    private fun toParticipantPayload(
        participant: ChatParticipantSummary,
    ): ChatParticipantSummaryEventPayload {
        return ChatParticipantSummaryEventPayload(
            userId = participant.userId,
            role = participant.role,
            displayName = participant.displayName,
        )
    }
}
