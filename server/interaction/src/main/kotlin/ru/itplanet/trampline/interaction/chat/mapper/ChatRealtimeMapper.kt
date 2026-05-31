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
import java.time.OffsetDateTime

@Component
class ChatRealtimeMapper {

    fun toMessageCreatedEvent(
        message: ChatMessage,
    ): ChatEventEnvelope {
        return ChatEventEnvelope(
            type = ChatEventType.MESSAGE_CREATED,
            dialogId = message.dialogId,
            occurredAt = message.createdAt ?: OffsetDateTime.now(),
            payload = ChatMessageEventPayload(
                id = message.id,
                dialogId = message.dialogId,
                senderUserId = message.senderUserId,
                senderRole = message.senderRole,
                messageType = message.messageType,
                body = message.body,
                clientMessageId = message.clientMessageId,
                createdAt = message.createdAt,
                editedAt = message.editedAt,
                deletedAt = message.deletedAt,
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
            ),
        )
    }

    fun toReadUpdatedEvent(
        dialogId: Long,
        readerUserId: Long,
        lastReadMessageId: Long,
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
