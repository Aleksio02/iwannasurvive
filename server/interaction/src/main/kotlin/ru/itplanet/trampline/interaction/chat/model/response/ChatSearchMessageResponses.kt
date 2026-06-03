package ru.itplanet.trampline.interaction.chat.model.response

import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageType
import java.time.OffsetDateTime

data class ChatSearchMessageResponse(
    val messageId: Long,
    val createdAt: OffsetDateTime?,
    val senderUserId: Long,
    val senderDisplayName: String,
    val snippet: String,
    val messageType: ChatMessageType,
)

data class ChatSearchMessagePageResponse(
    val items: List<ChatSearchMessageResponse>,
    val nextCursor: String?,
)
