package ru.itplanet.trampline.interaction.chat.service

import org.springframework.stereotype.Service
import ru.itplanet.trampline.interaction.chat.dao.ChatDialogDao
import ru.itplanet.trampline.interaction.chat.dao.ChatMessageDao
import ru.itplanet.trampline.interaction.chat.dao.ChatMessageReactionDao
import ru.itplanet.trampline.interaction.chat.dao.ChatPinnedMessageDao
import ru.itplanet.trampline.interaction.chat.mapper.ChatDomainMapper
import ru.itplanet.trampline.interaction.chat.model.ChatMessage
import ru.itplanet.trampline.interaction.chat.model.ChatMessageReaction
import ru.itplanet.trampline.interaction.chat.model.ChatMessageReplyPreview

@Service
class ChatMessageEnrichmentService(
    private val chatDialogDao: ChatDialogDao,
    private val chatMessageDao: ChatMessageDao,
    private val chatMessageReactionDao: ChatMessageReactionDao,
    private val chatPinnedMessageDao: ChatPinnedMessageDao,
    private val chatDomainMapper: ChatDomainMapper,
) {
    fun enrich(
        message: ChatMessage,
        currentUserId: Long,
    ): ChatMessage {
        return enrich(listOf(message), currentUserId).first()
    }

    fun enrich(
        messages: List<ChatMessage>,
        currentUserId: Long,
    ): List<ChatMessage> {
        if (messages.isEmpty()) return emptyList()

        val messageIds = messages.map { it.id }
        val reactionsByMessageId = chatMessageReactionDao.findByMessageIds(messageIds)
            .groupBy { it.id.messageId }
            .mapValues { (_, rows) ->
                rows.groupBy { it.reaction }
                    .map { (reaction, reactionRows) ->
                        ChatMessageReaction(
                            reaction = reaction,
                            count = reactionRows.size.toLong(),
                            reactedByMe = reactionRows.any { it.id.userId == currentUserId },
                        )
                    }
                    .sortedBy { ALLOWED_REACTIONS.indexOf(it.reaction).takeIf { index -> index >= 0 } ?: Int.MAX_VALUE }
            }

        val pinnedByDialogId = messages.map { it.dialogId }.distinct()
            .mapNotNull { chatPinnedMessageDao.findByDialogId(it) }
            .associateBy { it.dialogId }

        return messages.map { message ->
            val replyTo = findReplyPreview(message, currentUserId)
            val pinnedMessage = pinnedByDialogId[message.dialogId]
            message.copy(
                reactions = reactionsByMessageId[message.id] ?: emptyList(),
                replyTo = replyTo,
                pinned = pinnedMessage?.messageId == message.id,
            )
        }
    }

    private fun findReplyPreview(
        message: ChatMessage,
        currentUserId: Long,
    ): ChatMessageReplyPreview? {
        val source = chatMessageDao.findById(message.id)
            .orElse(null)
            ?: return null
        val replyToId = source.replyToMessageId
            ?: return null
        val reply = chatMessageDao.findVisibleByIdAndDialogIdForUser(
            messageId = replyToId,
            dialogId = source.dialogId,
            currentUserId = currentUserId,
        ) ?: return ChatMessageReplyPreview(
            id = replyToId,
            senderUserId = 0,
            senderDisplayName = "Сообщение",
            bodyPreview = "Сообщение недоступно",
            attachmentKind = null,
            deleted = false,
        )
        val dialog = chatDialogDao.findById(reply.dialogId).orElse(null)
        val senderName = when (reply.senderUserId) {
            dialog?.applicantUserId -> dialog.applicantNameSnapshot
            dialog?.employerUserId -> dialog.companyNameSnapshot
            else -> "Участник"
        }
        val deleted = reply.deletedAt != null
        val attachmentKind = reply.attachments.firstOrNull()?.attachmentKind?.name

        return ChatMessageReplyPreview(
            id = replyToId,
            senderUserId = reply.senderUserId,
            senderDisplayName = senderName,
            bodyPreview = if (deleted) "Сообщение удалено" else chatDomainMapper.buildPreview(
                body = reply.body,
                attachmentFileName = reply.attachments.firstOrNull()?.originalFileName,
                isImage = reply.attachments.firstOrNull()?.attachmentKind?.name == "IMAGE",
            ),
            attachmentKind = attachmentKind,
            deleted = deleted,
        )
    }

    companion object {
        val ALLOWED_REACTIONS = listOf("👍", "❤️", "😂", "😮", "🙏", "😢", "🔥", "👏", "🎉", "🤔", "👀", "✅", "🚀")
    }
}
