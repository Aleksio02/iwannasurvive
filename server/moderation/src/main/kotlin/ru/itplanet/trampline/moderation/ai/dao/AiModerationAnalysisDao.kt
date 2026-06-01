package ru.itplanet.trampline.moderation.ai.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.moderation.ai.dao.dto.AiModerationAnalysisDto

interface AiModerationAnalysisDao : JpaRepository<AiModerationAnalysisDto, Long> {
    fun findByTaskId(taskId: Long): AiModerationAnalysisDto?
}
