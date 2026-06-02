package ru.itplanet.trampline.opportunity.ai.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import ru.itplanet.trampline.commons.model.enums.TagCategory
import ru.itplanet.trampline.opportunity.ai.client.YandexGptClient
import ru.itplanet.trampline.opportunity.ai.config.AiTagSuggestionProperties
import ru.itplanet.trampline.opportunity.ai.config.YandexGptProperties
import ru.itplanet.trampline.opportunity.ai.model.AllowedTag
import ru.itplanet.trampline.opportunity.dao.TagDao
import ru.itplanet.trampline.opportunity.exception.OpportunityIntegrationException
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus
import ru.itplanet.trampline.opportunity.model.request.AiTagSuggestionRequest
import ru.itplanet.trampline.opportunity.model.response.AiTagSuggestionResponse

@Service
class AiTagSuggestionService(
    private val properties: AiTagSuggestionProperties,
    private val yandexGptProperties: YandexGptProperties,
    private val tagDao: TagDao,
    private val sanitizer: AiTagSuggestionInputSanitizer,
    private val promptFactory: AiTagSuggestionPromptFactory,
    private val resultParser: AiTagSuggestionResultParser,
    private val yandexGptClient: YandexGptClient,
) {
    fun suggest(request: AiTagSuggestionRequest): AiTagSuggestionResponse {
        if (!properties.enabled) {
            throw OpportunityIntegrationException("Предложение тегов с помощью ИИ временно недоступно")
        }
        if (!yandexGptProperties.isConfigured()) {
            throw OpportunityIntegrationException("Предложение тегов с помощью ИИ временно недоступно")
        }

        val allowedTags = tagDao.findAllByIsActiveTrueAndModerationStatusAndCategoryOrderByNameAsc(
            moderationStatus = TagModerationStatus.APPROVED,
            category = TagCategory.TECH,
        )
            .take(properties.maxCandidateTags.coerceAtLeast(0))
            .map { tag -> AllowedTag(checkNotNull(tag.id), tag.name) }

        if (allowedTags.isEmpty()) {
            return AiTagSuggestionResponse(emptyList())
        }

        val input = sanitizer.sanitize(request)

        return try {
            val rawResult = yandexGptClient.complete(
                systemPrompt = promptFactory.systemPrompt(),
                userPrompt = promptFactory.userPrompt(input, allowedTags),
            )
            resultParser.parse(rawResult, allowedTags)
        } catch (exception: Exception) {
            logger.warn("AI tag suggestion failed: {}", exception.javaClass.simpleName)
            throw OpportunityIntegrationException("Не удалось предложить теги")
        }
    }

    private companion object {
        val logger = LoggerFactory.getLogger(AiTagSuggestionService::class.java)
    }
}
