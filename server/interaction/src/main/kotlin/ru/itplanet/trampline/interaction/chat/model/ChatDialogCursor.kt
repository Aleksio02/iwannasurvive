package ru.itplanet.trampline.interaction.chat.model

import java.time.OffsetDateTime

data class ChatDialogCursor(
    val sortAt: OffsetDateTime,
    val dialogId: Long,
)
