package ru.itplanet.trampline.interaction.chat.model.request

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Positive

data class GetChatDialogListRequest(
    @field:Min(value = 1, message = "Параметр limit должен быть не меньше 1")
    @field:Max(value = 100, message = "Параметр limit должен быть не больше 100")
    val limit: Int = 20,

    @field:Positive(message = "Идентификатор возможности должен быть положительным")
    val opportunityId: Long? = null,

    val unreadOnly: Boolean = false,
    val archived: Boolean = false,
    val cursor: String? = null,
)
