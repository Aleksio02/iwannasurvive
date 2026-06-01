package ru.itplanet.trampline.moderation.ai.event

import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Component

@Component
class AiModerationEventPublisher(private val publisher: ApplicationEventPublisher) {
    fun publish(taskId: Long) = publisher.publishEvent(AiModerationRequestedEvent(taskId))
}
