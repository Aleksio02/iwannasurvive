package ru.itplanet.trampline.interaction.chat.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogDto

interface ChatDialogDao : JpaRepository<ChatDialogDto, Long> {
    fun findByOpportunityResponseId(opportunityResponseId: Long): ChatDialogDto?
}
