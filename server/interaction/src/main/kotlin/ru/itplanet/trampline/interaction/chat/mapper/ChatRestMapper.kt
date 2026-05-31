package ru.itplanet.trampline.interaction.chat.mapper

import org.springframework.stereotype.Component
import ru.itplanet.trampline.interaction.chat.model.ChatDialog
import ru.itplanet.trampline.interaction.chat.model.ChatDialogCursor
import ru.itplanet.trampline.interaction.chat.model.ChatDialogListItem
import ru.itplanet.trampline.interaction.chat.model.ChatDialogListQuery
import ru.itplanet.trampline.interaction.chat.model.ChatDialogPage
import ru.itplanet.trampline.interaction.chat.model.ChatMessage
import ru.itplanet.trampline.interaction.chat.model.ChatMessageSliceQuery
import ru.itplanet.trampline.interaction.chat.model.ChatParticipantSummary
import ru.itplanet.trampline.interaction.chat.model.request.GetChatDialogListRequest
import ru.itplanet.trampline.interaction.chat.model.request.GetChatMessagesRequest
import ru.itplanet.trampline.interaction.chat.model.response.ChatDialogListItemResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatDialogPageResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatDialogResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatMessageResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatParticipantSummaryResponse
import ru.itplanet.trampline.interaction.exception.InteractionBadRequestException
import java.nio.charset.StandardCharsets
import java.time.OffsetDateTime
import java.util.Base64

@Component
class ChatRestMapper {

    fun toChatDialogListQuery(
        request: GetChatDialogListRequest,
    ): ChatDialogListQuery {
        return ChatDialogListQuery(
            opportunityId = request.opportunityId,
            unreadOnly = request.unreadOnly,
            archived = request.archived,
            limit = request.limit,
            cursor = decodeCursor(request.cursor),
        )
    }

    fun toChatMessageSliceQuery(
        request: GetChatMessagesRequest,
    ): ChatMessageSliceQuery {
        return ChatMessageSliceQuery(
            beforeMessageId = request.beforeMessageId,
            afterMessageId = request.afterMessageId,
            limit = request.limit,
        )
    }

    fun toChatDialogResponse(
        dialog: ChatDialog,
    ): ChatDialogResponse {
        return ChatDialogResponse(
            dialogId = dialog.dialogId,
            opportunityResponseId = dialog.opportunityResponseId,
            opportunityId = dialog.opportunityId,
            opportunityTitle = dialog.opportunityTitle,
            companyName = dialog.companyName,
            counterpart = toChatParticipantSummaryResponse(dialog.counterpart),
            status = dialog.status,
            responseStatus = dialog.responseStatus,
            lastMessagePreview = dialog.lastMessagePreview,
            lastMessageAt = dialog.lastMessageAt,
            unreadCount = dialog.unreadCount,
            canSend = dialog.canSend,
            archived = dialog.archived,
            createdAt = dialog.createdAt,
            updatedAt = dialog.updatedAt,
        )
    }

    fun toChatDialogPageResponse(
        page: ChatDialogPage,
    ): ChatDialogPageResponse {
        return ChatDialogPageResponse(
            items = page.items.map(::toChatDialogListItemResponse),
            nextCursor = page.nextCursor?.let(::encodeCursor),
        )
    }

    fun toChatDialogListItemResponse(
        item: ChatDialogListItem,
    ): ChatDialogListItemResponse {
        return ChatDialogListItemResponse(
            dialogId = item.dialogId,
            opportunityResponseId = item.opportunityResponseId,
            opportunityId = item.opportunityId,
            opportunityTitle = item.opportunityTitle,
            companyName = item.companyName,
            counterpart = toChatParticipantSummaryResponse(item.counterpart),
            lastMessagePreview = item.lastMessagePreview,
            lastMessageAt = item.lastMessageAt,
            unreadCount = item.unreadCount,
            canSend = item.canSend,
            responseStatus = item.responseStatus,
            archived = item.archived,
        )
    }

    fun toChatMessageResponse(
        message: ChatMessage,
    ): ChatMessageResponse {
        return ChatMessageResponse(
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
        )
    }

    private fun toChatParticipantSummaryResponse(
        participant: ChatParticipantSummary,
    ): ChatParticipantSummaryResponse {
        return ChatParticipantSummaryResponse(
            userId = participant.userId,
            role = participant.role,
            displayName = participant.displayName,
        )
    }

    private fun encodeCursor(
        cursor: ChatDialogCursor,
    ): String {
        val rawCursor = "${cursor.sortAt}|${cursor.dialogId}"

        return Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(rawCursor.toByteArray(StandardCharsets.UTF_8))
    }

    private fun decodeCursor(
        value: String?,
    ): ChatDialogCursor? {
        val rawValue = value?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?: return null

        val decoded = try {
            String(
                Base64.getUrlDecoder().decode(rawValue),
                StandardCharsets.UTF_8,
            )
        } catch (_: IllegalArgumentException) {
            throw invalidCursor()
        }

        val separatorIndex = decoded.lastIndexOf('|')
        if (separatorIndex <= 0 || separatorIndex >= decoded.lastIndex) {
            throw invalidCursor()
        }

        val sortAt = try {
            OffsetDateTime.parse(decoded.substring(0, separatorIndex))
        } catch (_: Exception) {
            throw invalidCursor()
        }

        val dialogId = decoded.substring(separatorIndex + 1).toLongOrNull()
            ?: throw invalidCursor()

        if (dialogId <= 0) {
            throw invalidCursor()
        }

        return ChatDialogCursor(
            sortAt = sortAt,
            dialogId = dialogId,
        )
    }

    private fun invalidCursor(): InteractionBadRequestException {
        return InteractionBadRequestException(
            message = "Параметр cursor имеет некорректный формат",
            code = "chat_dialog_cursor_invalid",
        )
    }
}
