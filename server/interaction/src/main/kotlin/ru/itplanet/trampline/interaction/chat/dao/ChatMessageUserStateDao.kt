package ru.itplanet.trampline.interaction.chat.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageUserStateDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageUserStateId

interface ChatMessageUserStateDao : JpaRepository<ChatMessageUserStateDto, ChatMessageUserStateId> {
    fun existsByIdMessageIdAndIdUserIdAndHiddenAtIsNotNull(
        messageId: Long,
        userId: Long,
    ): Boolean
}
