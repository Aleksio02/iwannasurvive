package ru.itplanet.trampline.moderation.ai.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.moderation.ai.config.AiModerationProperties
import ru.itplanet.trampline.moderation.ai.config.YandexGptProperties
import ru.itplanet.trampline.moderation.ai.dao.AiModerationAnalysisDao
import ru.itplanet.trampline.moderation.ai.dao.dto.AiModerationAnalysisDto
import ru.itplanet.trampline.moderation.ai.event.AiModerationEventPublisher
import ru.itplanet.trampline.moderation.ai.model.AiModerationStatus
import ru.itplanet.trampline.moderation.dao.dto.ModerationTaskDto
import java.security.MessageDigest
import java.time.OffsetDateTime

@Service
class AiModerationCommandService(
    private val dao: AiModerationAnalysisDao,
    private val policy: AiModerationPolicy,
    private val moderationProperties: AiModerationProperties,
    private val yandexProperties: YandexGptProperties,
    private val inputFactory: AiModerationInputFactory,
    private val publisher: AiModerationEventPublisher,
    private val objectMapper: ObjectMapper,
) {
    @Transactional
    fun request(task: ModerationTaskDto, snapshot: com.fasterxml.jackson.databind.JsonNode) {
        val taskId = task.id ?: error("Task id must be assigned")
        if (!policy.isEnabled() || dao.findByTaskId(taskId) != null) return
        val supported = policy.isSupported(task.entityType, task.taskType)
        val now = OffsetDateTime.now()
        val input = if (supported) inputFactory.create(task.entityType, snapshot).fields else objectMapper.createObjectNode()
        dao.save(AiModerationAnalysisDto().apply {
            this.task = task
            entityType = task.entityType
            entityId = task.entityId
            taskType = task.taskType
            modelUri = yandexProperties.resolvedModelUri()
            endpoint = yandexProperties.endpoint
            promptVersion = moderationProperties.promptVersion
            inputHash = sha256(input.toString())
            status = if (supported) AiModerationStatus.PENDING else AiModerationStatus.SKIPPED
            createdAt = now
            updatedAt = now
            if (!supported) finishedAt = now
        })
        if (supported) publisher.publish(taskId)
    }

    private fun sha256(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray()).joinToString("") { "%02x".format(it) }
}
