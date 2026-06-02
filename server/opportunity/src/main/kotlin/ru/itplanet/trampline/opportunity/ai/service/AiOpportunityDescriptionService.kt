package ru.itplanet.trampline.opportunity.ai.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import ru.itplanet.trampline.opportunity.ai.client.YandexGptClient
import ru.itplanet.trampline.opportunity.ai.config.AiOpportunityDescriptionProperties
import ru.itplanet.trampline.opportunity.ai.config.YandexGptProperties
import ru.itplanet.trampline.opportunity.exception.OpportunityIntegrationException
import ru.itplanet.trampline.opportunity.exception.OpportunityValidationException
import ru.itplanet.trampline.opportunity.model.request.AiOpportunityDescriptionRequest
import ru.itplanet.trampline.opportunity.model.response.AiOpportunityDescriptionResponse

@Service
class AiOpportunityDescriptionService(
    private val properties: AiOpportunityDescriptionProperties,
    private val yandexGptProperties: YandexGptProperties,
    private val sanitizer: AiOpportunityDescriptionInputSanitizer,
    private val promptFactory: AiOpportunityDescriptionPromptFactory,
    private val resultParser: AiOpportunityDescriptionResultParser,
    private val yandexGptClient: YandexGptClient,
) {
    fun generate(request: AiOpportunityDescriptionRequest): AiOpportunityDescriptionResponse {
        if (!properties.enabled || !yandexGptProperties.isConfigured()) {
            throw OpportunityIntegrationException("Генерация описания с помощью ИИ временно недоступна")
        }
        if (!hasMeaningfulInput(request)) {
            throw OpportunityValidationException("Укажите название, требования или короткие тезисы для ИИ")
        }

        val input = sanitizer.sanitize(request)

        return try {
            val rawResult = yandexGptClient.complete(
                systemPrompt = promptFactory.systemPrompt(),
                userPrompt = promptFactory.userPrompt(input),
            )
            resultParser.parse(rawResult)
        } catch (exception: Exception) {
            logger.warn("AI opportunity description generation failed: {}", exception.javaClass.simpleName)
            throw OpportunityIntegrationException("Не удалось сгенерировать описание")
        }
    }

    private fun hasMeaningfulInput(request: AiOpportunityDescriptionRequest): Boolean {
        return sequenceOf(request.title, request.requirements, request.notes)
            .any { value -> !value.isNullOrBlank() }
    }

    private companion object {
        val logger = LoggerFactory.getLogger(AiOpportunityDescriptionService::class.java)
    }
}
