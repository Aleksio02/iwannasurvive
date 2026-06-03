package ru.itplanet.trampline.interaction.chat.model.request

import jakarta.validation.constraints.Positive

data class MarkUnreadRequest(
    @field:Positive(message = "Идентификатор сообщения должен быть положительным")
    val fromMessageId: Long? = null,
)
