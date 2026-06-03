package ru.itplanet.trampline.interaction.chat.dao

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageAttachmentDto

interface ChatMessageAttachmentDao : JpaRepository<ChatMessageAttachmentDto, Long> {
    @Query(
        """
        SELECT a FROM ChatMessageAttachmentDto a
        JOIN a.message m
        WHERE a.id = :id
          AND m.dialogId = :dialogId
          AND m.deletedAt IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM ChatMessageUserStateDto s
              WHERE s.id.messageId = m.id
                AND s.id.userId = :currentUserId
                AND s.hiddenAt IS NOT NULL
          )
        """,
    )
    fun findVisibleByIdAndMessageDialogIdForUser(
        @Param("id") id: Long,
        @Param("dialogId") dialogId: Long,
        @Param("currentUserId") currentUserId: Long,
    ): ChatMessageAttachmentDto?
}
