package ru.itplanet.trampline.interaction.chat.dao

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageReactionDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageReactionId

interface ChatMessageReactionDao : JpaRepository<ChatMessageReactionDto, ChatMessageReactionId> {
    @Query(
        """
        SELECT r FROM ChatMessageReactionDto r
        WHERE r.id.messageId IN :messageIds
        """,
    )
    fun findByMessageIds(
        @Param("messageIds") messageIds: Collection<Long>,
    ): List<ChatMessageReactionDto>
}
