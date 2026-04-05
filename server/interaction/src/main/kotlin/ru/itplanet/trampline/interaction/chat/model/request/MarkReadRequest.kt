package ru.itplanet.trampline.interaction.chat.model.request

import jakarta.validation.constraints.Positive

data class MarkReadRequest(
    @field:Positive(message = "Идентификатор последнего прочитанного сообщения должен быть положительным")
    val lastReadMessageId: Long,
)
