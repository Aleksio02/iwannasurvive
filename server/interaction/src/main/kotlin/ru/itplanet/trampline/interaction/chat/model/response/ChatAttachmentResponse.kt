package ru.itplanet.trampline.interaction.chat.model.response

import ru.itplanet.trampline.interaction.chat.dao.dto.ChatAttachmentKind

data class ChatAttachmentResponse(
    val id: Long,
    val fileId: Long,
    val originalFileName: String,
    val mediaType: String,
    val sizeBytes: Long,
    val attachmentKind: ChatAttachmentKind,
)
