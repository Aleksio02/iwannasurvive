package ru.itplanet.trampline.opportunity.ai.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Component
import ru.itplanet.trampline.opportunity.ai.config.AiResumeAnalysisProperties
import ru.itplanet.trampline.opportunity.ai.model.AiResumeAnalysisParsedResult
import ru.itplanet.trampline.opportunity.ai.model.AiResumeAnalysisParsedTag

@Component
class AiResumeAnalysisResultParser(
    private val objectMapper: ObjectMapper,
    private val properties: AiResumeAnalysisProperties,
    private val jsonExtractor: AiJsonExtractor,
) {
    fun parse(text: String): AiResumeAnalysisParsedResult {
        val root = try {
            objectMapper.readTree(jsonExtractor.extractJsonObject(text))
        } catch (exception: Exception) {
            throw IllegalArgumentException("AI-провайдер вернул некорректный ответ", exception)
        }

        return AiResumeAnalysisParsedResult(
            summary = root.path("summary").asCleanString()
                .takeIf(String::isNotBlank)
                ?: "Нашли данные, которые можно использовать для профиля.",
            detectedSkills = root.path("detectedSkills")
                .asStringList(properties.maxSuggestedSkills),
            suggestedSkillTags = root.path("suggestedSkillTags")
                .asTagList(properties.maxSuggestedSkills),
            suggestedInterestTags = root.path("suggestedInterestTags")
                .asTagList(properties.maxSuggestedInterests),
            strengths = root.path("strengths").asStringList(properties.maxStrengths),
            improvementTips = root.path("improvementTips").asStringList(properties.maxImprovementTips),
        )
    }

    private fun JsonNode.asStringList(limit: Int): List<String> {
        if (!isArray) {
            return emptyList()
        }

        return mapNotNull { item -> item.asCleanString().takeIf(String::isNotBlank) }
            .distinctBy { it.lowercase() }
            .take(limit.coerceAtLeast(0))
    }

    private fun JsonNode.asTagList(limit: Int): List<AiResumeAnalysisParsedTag> {
        if (!isArray) {
            return emptyList()
        }

        return mapNotNull { item ->
            val name = item.path("name").asCleanString().takeIf(String::isNotBlank)
                ?: return@mapNotNull null
            val confidence = item.path("confidence").asInt(0).coerceIn(0, 100)
            AiResumeAnalysisParsedTag(name, confidence)
        }
            .groupBy { it.name.lowercase() }
            .map { (_, tags) -> tags.maxBy { it.confidence } }
            .sortedByDescending { it.confidence }
            .take(limit.coerceAtLeast(0))
    }

    private fun JsonNode.asCleanString(): String {
        return (if (isTextual) asText() else "")
            .trim()
            .replace(WHITESPACE_REGEX, " ")
    }

    private companion object {
        val WHITESPACE_REGEX = Regex("\\s+")
    }
}
