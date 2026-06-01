package ru.itplanet.trampline.moderation.ai.event

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component
import org.springframework.transaction.event.TransactionPhase
import org.springframework.transaction.event.TransactionalEventListener
import ru.itplanet.trampline.moderation.ai.service.AiModerationService

@Component
class AiModerationEventListener(private val service: AiModerationService) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    fun onRequested(event: AiModerationRequestedEvent) {
        runCatching { service.process(event.taskId) }
            .onFailure { logger.warn("AI moderation async handler failed for taskId={}, errorType={}", event.taskId, it.javaClass.simpleName) }
    }
}
