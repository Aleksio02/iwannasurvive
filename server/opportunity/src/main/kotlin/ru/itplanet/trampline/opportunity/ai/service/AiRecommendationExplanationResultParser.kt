package ru.itplanet.trampline.opportunity.ai.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Component
import ru.itplanet.trampline.opportunity.ai.config.AiRecommendationExplanationProperties
import ru.itplanet.trampline.opportunity.ai.model.AiRecommendationExplanationResult

@Component
class AiRecommendationExplanationResultParser(
    private val objectMapper: ObjectMapper,
    private val properties: AiRecommendationExplanationProperties,
    private val jsonExtractor: AiJsonExtractor,
) {
    fun parse(text: String): AiRecommendationExplanationResult {
        val root = objectMapper.readTree(jsonExtractor.extractJsonObject(text))
        return AiRecommendationExplanationResult(
            summary = root.requiredText("summary"),
            whyFits = root.requiredTextList("whyFits").take(properties.maxReasons.coerceAtLeast(0)),
            whatToImprove = root.requiredTextList("whatToImprove").take(properties.maxImprovementTips.coerceAtLeast(0)),
        )
    }

    private fun JsonNode.requiredText(fieldName: String): String {
        val field = get(fieldName)
        require(field != null && field.isTextual) { "AI-провайдер вернул некорректный ответ" }
        return normalize(field.asText()).also {
            require(it.isNotBlank()) { "AI-провайдер вернул некорректный ответ" }
        }
    }

    private fun JsonNode.requiredTextList(fieldName: String): List<String> {
        val field = get(fieldName)
        require(field != null && field.isArray) { "AI-провайдер вернул некорректный ответ" }
        return field.map {
            require(it.isTextual) { "AI-провайдер вернул некорректный ответ" }
            normalize(it.asText()).also { value ->
                require(value.isNotBlank()) { "AI-провайдер вернул некорректный ответ" }
            }
        }
    }

    private fun normalize(value: String): String = value.replace(WHITESPACE_REGEX, " ").trim()

    private companion object {
        val WHITESPACE_REGEX = Regex("""\s+""")
    }
}
