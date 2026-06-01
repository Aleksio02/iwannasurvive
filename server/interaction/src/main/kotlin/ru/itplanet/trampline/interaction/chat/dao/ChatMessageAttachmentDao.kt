package ru.itplanet.trampline.interaction.chat.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageAttachmentDto

interface ChatMessageAttachmentDao : JpaRepository<ChatMessageAttachmentDto, Long> {
    fun findByIdAndMessageDialogId(
        id: Long,
        dialogId: Long,
    ): ChatMessageAttachmentDto?
}
