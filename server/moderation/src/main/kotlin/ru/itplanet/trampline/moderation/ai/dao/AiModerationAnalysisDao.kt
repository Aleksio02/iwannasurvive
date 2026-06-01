package ru.itplanet.trampline.moderation.ai.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.moderation.ai.dao.dto.AiModerationAnalysisDto
import ru.itplanet.trampline.moderation.ai.model.AiModerationStatus
import java.time.OffsetDateTime

interface AiModerationAnalysisDao : JpaRepository<AiModerationAnalysisDto, Long> {
    fun findByTaskId(taskId: Long): AiModerationAnalysisDto?
    fun findTop100ByStatusAndUpdatedAtBeforeOrderByUpdatedAtAsc(
        status: AiModerationStatus,
        updatedAt: OffsetDateTime,
    ): List<AiModerationAnalysisDto>
}
