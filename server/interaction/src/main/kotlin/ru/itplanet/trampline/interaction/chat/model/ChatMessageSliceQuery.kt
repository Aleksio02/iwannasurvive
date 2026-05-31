package ru.itplanet.trampline.interaction.chat.model

import ru.itplanet.trampline.interaction.exception.InteractionBadRequestException

data class ChatMessageSliceQuery(
    val beforeMessageId: Long? = null,
    val afterMessageId: Long? = null,
    val limit: Int = 50,
) {
    init {
        beforeMessageId?.let {
            if (it <= 0) {
                throw InteractionBadRequestException(
                    message = "Параметр beforeMessageId должен быть положительным",
                    code = "chat_before_message_id_invalid",
                )
            }
        }

        afterMessageId?.let {
            if (it <= 0) {
                throw InteractionBadRequestException(
                    message = "Параметр afterMessageId должен быть положительным",
                    code = "chat_after_message_id_invalid",
                )
            }
        }

        if (beforeMessageId != null && afterMessageId != null) {
            throw InteractionBadRequestException(
                message = "Можно передать только один из параметров beforeMessageId или afterMessageId",
                code = "chat_message_slice_direction_invalid",
            )
        }

        if (limit !in 1..100) {
            throw InteractionBadRequestException(
                message = "Параметр limit должен быть от 1 до 100",
                code = "chat_message_limit_invalid",
            )
        }
    }
}
