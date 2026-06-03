package ru.itplanet.trampline.opportunity.ai.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import ru.itplanet.trampline.opportunity.ai.client.YandexGptClient
import ru.itplanet.trampline.opportunity.ai.config.AiRecommendationExplanationProperties
import ru.itplanet.trampline.opportunity.ai.config.YandexGptProperties
import ru.itplanet.trampline.opportunity.ai.model.AiRecommendationExplanationInput
import ru.itplanet.trampline.opportunity.model.PersonalizedRecommendationExplanation
import ru.itplanet.trampline.opportunity.model.RecommendationExplanationSource

@Service
class AiRecommendationExplanationService(
    private val properties: AiRecommendationExplanationProperties,
    private val yandexGptProperties: YandexGptProperties,
    private val promptFactory: AiRecommendationExplanationPromptFactory,
    private val resultParser: AiRecommendationExplanationResultParser,
    private val yandexGptClient: YandexGptClient,
) {
    fun explain(
        input: AiRecommendationExplanationInput,
        fallback: PersonalizedRecommendationExplanation,
    ): PersonalizedRecommendationExplanation {
        if (!properties.enabled || !yandexGptProperties.isConfigured()) return fallback

        return try {
            val result = resultParser.parse(
                yandexGptClient.complete(
                    systemPrompt = promptFactory.systemPrompt(),
                    userPrompt = promptFactory.userPrompt(input),
                ),
            )
            PersonalizedRecommendationExplanation(
                source = RecommendationExplanationSource.AI,
                summary = result.summary,
                whyFits = result.whyFits,
                whatToImprove = result.whatToImprove,
            )
        } catch (exception: Exception) {
            logger.warn("AI recommendation explanation failed: {}", exception.javaClass.simpleName)
            fallback
        }
    }

    private companion object {
        val logger = LoggerFactory.getLogger(AiRecommendationExplanationService::class.java)
    }
}
