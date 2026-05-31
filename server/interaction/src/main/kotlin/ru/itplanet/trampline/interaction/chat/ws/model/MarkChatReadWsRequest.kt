package ru.itplanet.trampline.interaction.chat.ws.model

import jakarta.validation.constraints.Positive

data class MarkChatReadWsRequest(
    @field:Positive(message = "Идентификатор последнего прочитанного сообщения должен быть положительным")
    val lastReadMessageId: Long,
)
