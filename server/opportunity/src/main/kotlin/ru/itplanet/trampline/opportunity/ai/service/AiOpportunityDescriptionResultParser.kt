package ru.itplanet.trampline.opportunity.ai.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Component
import ru.itplanet.trampline.opportunity.ai.config.AiOpportunityDescriptionProperties
import ru.itplanet.trampline.opportunity.model.response.AiOpportunityDescriptionResponse

@Component
class AiOpportunityDescriptionResultParser(
    private val objectMapper: ObjectMapper,
    private val properties: AiOpportunityDescriptionProperties,
    private val jsonExtractor: AiJsonExtractor,
) {
    fun parse(text: String): AiOpportunityDescriptionResponse {
        val root = objectMapper.readTree(jsonExtractor.extractJsonObject(text))
        val shortDescription = root.requiredText("shortDescription", allowBlank = false)
        val fullDescription = root.requiredText("fullDescription", allowBlank = false)
        val requirements = root.requiredText("requirements", allowBlank = true)

        return AiOpportunityDescriptionResponse(
            shortDescription = shortDescription.take(properties.maxShortDescriptionChars.coerceAtLeast(0)),
            fullDescription = fullDescription.take(properties.maxFullDescriptionChars.coerceAtLeast(0)),
            requirements = requirements.take(properties.maxRequirementsChars.coerceAtLeast(0)),
        )
    }

    private fun JsonNode.requiredText(fieldName: String, allowBlank: Boolean): String {
        val field = get(fieldName)
        require(field != null && field.isTextual) { "AI-провайдер вернул некорректный ответ" }

        val normalized = field.asText().replace(WHITESPACE_REGEX, " ").trim()
        require(allowBlank || normalized.isNotBlank()) { "AI-провайдер вернул некорректный ответ" }
        return normalized
    }

    private companion object {
        val WHITESPACE_REGEX = Regex("""\s+""")
    }
}
