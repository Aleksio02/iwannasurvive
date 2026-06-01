package ru.itplanet.trampline.interaction.chat.model.response

import java.time.OffsetDateTime

data class ChatAttachmentDownloadUrlResponse(
    val url: String,
    val expiresAt: OffsetDateTime,
)
