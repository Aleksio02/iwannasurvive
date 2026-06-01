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
        val parsedTags = objectMapper.readTree(text.trim()).path("tags")

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
}
