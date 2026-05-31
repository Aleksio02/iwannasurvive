package ru.itplanet.trampline.interaction.chat.dao

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageDto

interface ChatMessageDao : JpaRepository<ChatMessageDto, Long> {
    fun findByDialogIdOrderByIdDesc(
        dialogId: Long,
        pageable: Pageable,
    ): List<ChatMessageDto>

    fun findByDialogIdAndIdLessThanOrderByIdDesc(
        dialogId: Long,
        beforeMessageId: Long,
        pageable: Pageable,
    ): List<ChatMessageDto>

    fun findByDialogIdAndIdGreaterThanOrderByIdAsc(
        dialogId: Long,
        afterMessageId: Long,
        pageable: Pageable,
    ): List<ChatMessageDto>

    fun findByDialogIdAndSenderUserIdAndClientMessageId(
        dialogId: Long,
        senderUserId: Long,
        clientMessageId: String,
    ): ChatMessageDto?
}
