package ru.itplanet.trampline.interaction.chat.ws.model

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class SendChatMessageWsRequest(
    @field:NotBlank(message = "clientMessageId обязателен")
    @field:Size(max = 100, message = "clientMessageId не должен превышать 100 символов")
    val clientMessageId: String,

    @field:NotBlank(message = "Текст сообщения не должен быть пустым")
    @field:Size(max = 4000, message = "Текст сообщения не должен превышать 4000 символов")
    val body: String,
)
