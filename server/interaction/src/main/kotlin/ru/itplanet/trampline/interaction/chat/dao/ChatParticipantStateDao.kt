package ru.itplanet.trampline.interaction.chat.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatParticipantStateDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatParticipantStateDtoId

interface ChatParticipantStateDao : JpaRepository<ChatParticipantStateDto, ChatParticipantStateDtoId> {
    fun findByIdDialogId(dialogId: Long): List<ChatParticipantStateDto>

    fun findByIdDialogIdAndIdUserId(
        dialogId: Long,
        userId: Long,
    ): ChatParticipantStateDto?

    fun findByIdUserIdOrderByLastReadAtDesc(userId: Long): List<ChatParticipantStateDto>
}
