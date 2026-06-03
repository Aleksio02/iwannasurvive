package ru.itplanet.trampline.interaction.chat.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class ChatReactionRequest(
    @field:NotBlank(message = "Реакция обязательна")
    @field:Size(max = 32, message = "Реакция не должна превышать 32 символа")
    val reaction: String,
)
