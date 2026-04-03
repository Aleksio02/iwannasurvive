package ru.itplanet.trampline.interaction.chat.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageDto

interface ChatMessageDao : JpaRepository<ChatMessageDto, Long> {
    fun findByDialogIdOrderByIdDesc(dialogId: Long): List<ChatMessageDto>

    fun findFirstByDialogIdOrderByIdDesc(dialogId: Long): ChatMessageDto?

    fun findByDialogIdAndSenderUserIdAndClientMessageId(
        dialogId: Long,
        senderUserId: Long,
        clientMessageId: String,
    ): ChatMessageDto?
}
