package ru.itplanet.trampline.interaction.chat.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class EditChatMessageRequest(
    @field:NotBlank(message = "Текст сообщения не должен быть пустым")
    @field:Size(max = 4000, message = "Текст сообщения не должен превышать 4000 символов")
    val body: String,
)
