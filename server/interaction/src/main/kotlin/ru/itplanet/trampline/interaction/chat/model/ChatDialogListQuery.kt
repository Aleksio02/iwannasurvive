package ru.itplanet.trampline.interaction.chat.model

import ru.itplanet.trampline.interaction.exception.InteractionBadRequestException

data class ChatDialogListQuery(
    val opportunityId: Long? = null,
    val unreadOnly: Boolean = false,
    val archived: Boolean = false,
    val limit: Int = 20,
    val cursor: ChatDialogCursor? = null,
) {
    init {
        opportunityId?.let {
            if (it <= 0) {
                throw InteractionBadRequestException(
                    message = "Идентификатор возможности должен быть положительным",
                    code = "chat_opportunity_id_invalid",
                )
            }
        }

        if (limit !in 1..100) {
            throw InteractionBadRequestException(
                message = "Параметр limit должен быть от 1 до 100",
                code = "chat_dialog_limit_invalid",
            )
        }
    }
}
