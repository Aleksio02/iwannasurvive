package ru.itplanet.trampline.moderation.ai.service

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.moderation.ai.config.AiModerationProperties
import ru.itplanet.trampline.moderation.ai.dao.AiModerationAnalysisDao
import ru.itplanet.trampline.moderation.ai.model.AiModerationStatus
import java.time.Duration
import java.time.OffsetDateTime

@Service
class AiModerationRecoveryService(
    private val analysisDao: AiModerationAnalysisDao,
    private val properties: AiModerationProperties,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelayString = "\${app.ai.moderation.recovery-interval-ms:60000}")
    @Transactional
    fun failStaleProcessingAnalyses() {
        val timeoutMs = properties.processingTimeoutMs.coerceAtLeast(properties.asyncTimeoutMs + 1000)
        val staleBefore = OffsetDateTime.now().minus(Duration.ofMillis(timeoutMs))
        val staleAnalyses = analysisDao.findTop100ByStatusAndUpdatedAtBeforeOrderByUpdatedAtAsc(
            AiModerationStatus.PROCESSING,
            staleBefore,
        )
        if (staleAnalyses.isEmpty()) return

        val now = OffsetDateTime.now()
        staleAnalyses.forEach { analysis ->
            analysis.status = AiModerationStatus.FAILED
            analysis.errorMessage = "ИИ-анализ временно недоступен"
            analysis.updatedAt = now
            analysis.finishedAt = now
        }
        analysisDao.saveAll(staleAnalyses)
        logger.warn("Marked stale AI moderation analyses as FAILED, count={}", staleAnalyses.size)
    }
}
