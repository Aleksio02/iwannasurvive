package ru.itplanet.trampline.interaction.chat.dao

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageDto

interface ChatMessageDao : JpaRepository<ChatMessageDto, Long> {
    @Query(
        """
        SELECT m FROM ChatMessageDto m
        WHERE m.dialogId = :dialogId
          AND NOT EXISTS (
              SELECT 1 FROM ChatMessageUserStateDto s
              WHERE s.id.messageId = m.id
                AND s.id.userId = :currentUserId
                AND s.hiddenAt IS NOT NULL
          )
        ORDER BY m.id DESC
        """,
    )
    fun findVisibleByDialogIdOrderByIdDesc(
        @Param("dialogId") dialogId: Long,
        @Param("currentUserId") currentUserId: Long,
        pageable: Pageable,
    ): List<ChatMessageDto>

    @Query(
        """
        SELECT m FROM ChatMessageDto m
        WHERE m.id = :messageId
          AND m.dialogId = :dialogId
          AND NOT EXISTS (
              SELECT 1 FROM ChatMessageUserStateDto s
              WHERE s.id.messageId = m.id
                AND s.id.userId = :currentUserId
                AND s.hiddenAt IS NOT NULL
          )
        """,
    )
    fun findVisibleByIdAndDialogIdForUser(
        @Param("messageId") messageId: Long,
        @Param("dialogId") dialogId: Long,
        @Param("currentUserId") currentUserId: Long,
    ): ChatMessageDto?

    @Query(
        """
        SELECT m FROM ChatMessageDto m
        WHERE m.dialogId = :dialogId
          AND m.id < :beforeMessageId
          AND NOT EXISTS (
              SELECT 1 FROM ChatMessageUserStateDto s
              WHERE s.id.messageId = m.id
                AND s.id.userId = :currentUserId
                AND s.hiddenAt IS NOT NULL
          )
        ORDER BY m.id DESC
        """,
    )
    fun findVisibleByDialogIdAndIdLessThanOrderByIdDesc(
        @Param("dialogId") dialogId: Long,
        @Param("beforeMessageId") beforeMessageId: Long,
        @Param("currentUserId") currentUserId: Long,
        pageable: Pageable,
    ): List<ChatMessageDto>

    @Query(
        """
        SELECT m FROM ChatMessageDto m
        WHERE m.dialogId = :dialogId
          AND m.id > :afterMessageId
          AND NOT EXISTS (
              SELECT 1 FROM ChatMessageUserStateDto s
              WHERE s.id.messageId = m.id
                AND s.id.userId = :currentUserId
                AND s.hiddenAt IS NOT NULL
          )
        ORDER BY m.id ASC
        """,
    )
    fun findVisibleByDialogIdAndIdGreaterThanOrderByIdAsc(
        @Param("dialogId") dialogId: Long,
        @Param("afterMessageId") afterMessageId: Long,
        @Param("currentUserId") currentUserId: Long,
        pageable: Pageable,
    ): List<ChatMessageDto>

    fun findTopByDialogIdAndIdLessThanOrderByIdDesc(
        dialogId: Long,
        messageId: Long,
    ): ChatMessageDto?

    fun findTopByDialogIdAndSenderUserIdNotOrderByIdDesc(
        dialogId: Long,
        senderUserId: Long,
    ): ChatMessageDto?

    @Query(
        """
        SELECT m FROM ChatMessageDto m
        WHERE m.dialogId = :dialogId
          AND m.deletedAt IS NULL
          AND LOWER(m.body) LIKE LOWER(CONCAT('%', :query, '%'))
          AND NOT EXISTS (
              SELECT 1 FROM ChatMessageUserStateDto s
              WHERE s.id.messageId = m.id
                AND s.id.userId = :currentUserId
                AND s.hiddenAt IS NOT NULL
          )
          AND (:cursor IS NULL OR m.id < :cursor)
        ORDER BY m.id DESC
        """,
    )
    fun searchVisibleMessages(
        @Param("dialogId") dialogId: Long,
        @Param("currentUserId") currentUserId: Long,
        @Param("query") query: String,
        @Param("cursor") cursor: Long?,
        pageable: Pageable,
    ): List<ChatMessageDto>

    fun findByDialogIdAndSenderUserIdAndClientMessageId(
        dialogId: Long,
        senderUserId: Long,
        clientMessageId: String,
    ): ChatMessageDto?
}
