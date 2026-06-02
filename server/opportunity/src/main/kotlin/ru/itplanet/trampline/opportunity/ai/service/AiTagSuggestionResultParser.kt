package ru.itplanet.trampline.opportunity.ai.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Component
import ru.itplanet.trampline.opportunity.ai.config.AiTagSuggestionProperties
import ru.itplanet.trampline.opportunity.ai.model.AllowedTag
import ru.itplanet.trampline.opportunity.model.response.AiSuggestedTagResponse
import ru.itplanet.trampline.opportunity.model.response.AiTagSuggestionResponse

@Component
class AiTagSuggestionResultParser(
    private val objectMapper: ObjectMapper,
    private val properties: AiTagSuggestionProperties,
) {
    fun parse(text: String, allowedTags: List<AllowedTag>): AiTagSuggestionResponse {
        val tagsById = allowedTags.associateBy(AllowedTag::id)
        val parsedTags = objectMapper.readTree(extractJsonObject(text)).path("tags")

        require(parsedTags.isArray) { "AI-провайдер вернул некорректный ответ" }

        val suggestions = parsedTags.mapNotNull { node ->
            val idNode = node.path("id")
            val confidenceNode = node.path("confidence")
            if (!idNode.isIntegralNumber || !confidenceNode.isNumber) return@mapNotNull null

            val id = idNode.asLong()
            val confidence = confidenceNode.asDouble()
            val tag = tagsById[id] ?: return@mapNotNull null
            if (!confidence.isFinite() || confidence !in 0.0..1.0) return@mapNotNull null

            AiSuggestedTagResponse(tag.id, tag.name, confidence)
        }
            .groupBy(AiSuggestedTagResponse::id)
            .mapNotNull { (_, tags) -> tags.maxByOrNull(AiSuggestedTagResponse::confidence) }
            .sortedByDescending(AiSuggestedTagResponse::confidence)
            .take(properties.maxSuggestions.coerceAtLeast(0))

        return AiTagSuggestionResponse(suggestions)
    }

    private fun extractJsonObject(text: String): String {
        val trimmedText = text.trim()
        val normalizedText = if (trimmedText.startsWith("```")) {
            trimmedText
                .substringAfter('\n', missingDelimiterValue = "")
                .removeSuffix("```")
                .trim()
        } else {
            trimmedText
        }

        val startIndex = normalizedText.indexOf('{')
        if (startIndex == -1) {
            throw IllegalArgumentException("AI-провайдер вернул ответ без JSON-объекта")
        }

        var depth = 0
        var isInsideString = false
        var isEscaped = false

        for (index in startIndex until normalizedText.length) {
            val character = normalizedText[index]

            if (isInsideString) {
                when {
                    isEscaped -> isEscaped = false
                    character == '\\' -> isEscaped = true
                    character == '"' -> isInsideString = false
                }
                continue
            }

            when (character) {
                '"' -> isInsideString = true
                '{' -> depth += 1
                '}' -> {
                    depth -= 1
                    if (depth == 0) {
                        return normalizedText.substring(startIndex, index + 1)
                    }
                }
            }
        }

        throw IllegalArgumentException("AI-провайдер вернул ответ без JSON-объекта")
    }
}
