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
    val body: String,
    val clientMessageId: String,
    val createdAt: OffsetDateTime?,
    val editedAt: OffsetDateTime?,
    val deletedAt: OffsetDateTime?,
)
