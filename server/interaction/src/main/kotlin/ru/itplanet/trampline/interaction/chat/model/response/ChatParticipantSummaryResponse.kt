package ru.itplanet.trampline.interaction.chat.model.response

import ru.itplanet.trampline.commons.model.Role

data class ChatParticipantSummaryResponse(
    val userId: Long,
    val role: Role,
    val displayName: String,
)
