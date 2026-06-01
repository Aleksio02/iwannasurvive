package ru.itplanet.trampline.moderation.ai.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate
import ru.itplanet.trampline.moderation.ai.client.YandexGptClient
import ru.itplanet.trampline.moderation.ai.config.YandexGptProperties
import ru.itplanet.trampline.moderation.ai.dao.AiModerationAnalysisDao
import ru.itplanet.trampline.moderation.ai.model.AiModerationStatus
import ru.itplanet.trampline.moderation.dao.ModerationLogDao
import ru.itplanet.trampline.moderation.dao.ModerationTaskDao
import ru.itplanet.trampline.moderation.model.ModerationLogAction
import java.time.OffsetDateTime

@Service
class AiModerationService(
    private val analysisDao: AiModerationAnalysisDao,
    private val taskDao: ModerationTaskDao,
    private val logDao: ModerationLogDao,
    private val policy: AiModerationPolicy,
    private val properties: YandexGptProperties,
    private val inputFactory: AiModerationInputFactory,
    private val promptFactory: AiModerationPromptFactory,
    private val parser: AiModerationResultParser,
    private val client: YandexGptClient,
    private val objectMapper: ObjectMapper,
    private val transactionTemplate: TransactionTemplate,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    fun process(taskId: Long) {
        val context = transactionTemplate.execute {
            val analysis = analysisDao.findByTaskId(taskId) ?: return@execute null
            if (!policy.isEnabled() || !policy.isSupported(analysis.entityType, analysis.taskType)) return@execute null
            if (analysis.status !in setOf(AiModerationStatus.PENDING, AiModerationStatus.FAILED)) return@execute null
            analysis.status = AiModerationStatus.PROCESSING
            analysis.attempts += 1
            analysis.updatedAt = OffsetDateTime.now()
            analysisDao.save(analysis)
            val task = taskDao.findById(taskId).orElseThrow()
            val snapshot = logDao.findByTaskIdOrderByCreatedAtAscIdAsc(taskId)
                .firstOrNull { it.action == ModerationLogAction.CREATED }?.payload ?: error("Snapshot задачи не найден")
            ProcessingContext(task.entityType, task.taskType, snapshot)
        } ?: return

        try {
            check(properties.isConfigured()) { "AI-провайдер не настроен" }
            val input = inputFactory.create(context.entityType, context.snapshot)
            val response = client.complete(promptFactory.systemPrompt(), promptFactory.userPrompt(context.entityType, context.taskType, input))
            val text = response.result?.alternatives?.firstOrNull()?.message?.text ?: error("AI-провайдер вернул пустой результат")
            val result = parser.parse(text)
            transactionTemplate.executeWithoutResult {
                val analysis = analysisDao.findByTaskId(taskId) ?: return@executeWithoutResult
                analysis.status = AiModerationStatus.SUCCESS
                analysis.verdict = result.verdict
                analysis.riskScore = result.riskScore
                analysis.categories = objectMapper.valueToTree(result.categories.map { it.name })
                analysis.reasons = objectMapper.valueToTree(result.reasons)
                analysis.highlightedFields = objectMapper.valueToTree(result.highlightedFields)
                analysis.moderatorHint = result.moderatorHint
                analysis.modelVersion = response.result.modelVersion
                analysis.rawResponse = objectMapper.valueToTree(response)
                analysis.errorMessage = null
                finish(analysis)
            }
        } catch (ex: Exception) {
            transactionTemplate.executeWithoutResult {
                val analysis = analysisDao.findByTaskId(taskId) ?: return@executeWithoutResult
                analysis.status = AiModerationStatus.FAILED
                analysis.errorMessage = "ИИ-анализ временно недоступен"
                finish(analysis)
            }
            logger.warn("AI moderation failed for taskId={}, entityType={}, taskType={}, errorType={}",
                taskId, context.entityType, context.taskType, ex.javaClass.simpleName)
        }
    }

    private fun finish(analysis: ru.itplanet.trampline.moderation.ai.dao.dto.AiModerationAnalysisDto) {
        analysis.updatedAt = OffsetDateTime.now()
        analysis.finishedAt = analysis.updatedAt
        analysisDao.save(analysis)
    }

    private data class ProcessingContext(
        val entityType: ru.itplanet.trampline.commons.model.moderation.ModerationEntityType,
        val taskType: ru.itplanet.trampline.commons.model.moderation.ModerationTaskType,
        val snapshot: com.fasterxml.jackson.databind.JsonNode,
    )
}
