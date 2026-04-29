package ru.itplanet.trampline.interaction.chat.model

import ru.itplanet.trampline.commons.model.Role

data class ChatParticipantSummary(
    val userId: Long,
    val role: Role,
    val displayName: String,
)
