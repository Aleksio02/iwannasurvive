package ru.itplanet.trampline.interaction.chat.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatPinnedMessageDto

interface ChatPinnedMessageDao : JpaRepository<ChatPinnedMessageDto, Long> {
    fun findByDialogId(dialogId: Long): ChatPinnedMessageDto?
    fun deleteByDialogId(dialogId: Long)
}
