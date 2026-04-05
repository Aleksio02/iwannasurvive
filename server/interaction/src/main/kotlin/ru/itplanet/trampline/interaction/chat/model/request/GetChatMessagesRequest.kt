package ru.itplanet.trampline.interaction.chat.model.request

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Positive

data class GetChatMessagesRequest(
    @field:Positive(message = "Параметр beforeMessageId должен быть положительным")
    val beforeMessageId: Long? = null,

    @field:Positive(message = "Параметр afterMessageId должен быть положительным")
    val afterMessageId: Long? = null,

    @field:Min(value = 1, message = "Параметр limit должен быть не меньше 1")
    @field:Max(value = 100, message = "Параметр limit должен быть не больше 100")
    val limit: Int = 50,
)
