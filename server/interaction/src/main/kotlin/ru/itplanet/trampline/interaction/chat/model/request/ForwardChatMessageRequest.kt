package ru.itplanet.trampline.interaction.chat.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size

data class ForwardChatMessageRequest(
    @field:Positive(message = "Идентификатор целевого диалога должен быть положительным")
    val targetDialogId: Long,

    @field:NotBlank(message = "clientMessageId обязателен")
    @field:Size(max = 100, message = "clientMessageId не должен превышать 100 символов")
    val clientMessageId: String,
)
