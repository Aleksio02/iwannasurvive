package ru.itplanet.trampline.interaction.chat.service

import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatParticipantStateDto
import java.time.OffsetDateTime

interface ChatParticipantStateService {
    fun ensureParticipantStates(dialog: ChatDialogDto)

    fun getOrCreateParticipantState(
        dialog: ChatDialogDto,
        userId: Long,
    ): ChatParticipantStateDto

    fun onMessageSent(
        dialog: ChatDialogDto,
        senderUserId: Long,
        messageId: Long,
        timestamp: OffsetDateTime,
    )
}
