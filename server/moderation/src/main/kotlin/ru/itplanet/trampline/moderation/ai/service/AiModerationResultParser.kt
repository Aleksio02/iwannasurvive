package ru.itplanet.trampline.moderation.ai.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Component
import ru.itplanet.trampline.moderation.ai.config.AiModerationProperties
import ru.itplanet.trampline.moderation.ai.model.*

@Component
class AiModerationResultParser(
    private val objectMapper: ObjectMapper,
    private val properties: AiModerationProperties,
) {
    fun parse(text: String): AiModerationResult {
        val node = objectMapper.readTree(text.trim().removePrefix("```json").removePrefix("```").removeSuffix("```").trim())
        val riskScore = node.path("riskScore").takeIf { it.isInt }?.asInt()
            ?: throw IllegalArgumentException("Некорректная оценка риска")
        require(riskScore in 0..100) { "Оценка риска вне допустимого диапазона" }
        val verdict = AiModerationVerdict.valueOf(node.path("verdict").asText())
        val categories = node.path("categories").mapNotNull { value ->
            runCatching { AiModerationCategory.valueOf(value.asText()) }.getOrNull()
        }.distinct()
        val reasons = node.path("reasons").mapNotNull { it.asText().trim().takeIf(String::isNotBlank)?.take(500) }
            .take(properties.maxReasons)
        val highlightedFields = node.path("highlightedFields").mapNotNull {
            val field = it.path("field").asText().trim().take(120)
            val issue = it.path("issue").asText().trim().take(500)
            if (field.isBlank() || issue.isBlank()) null else AiModerationFieldIssue(field, issue)
        }.take(properties.maxHighlightedFields)
        return AiModerationResult(
            verdict, riskScore, categories, reasons, highlightedFields,
            node.path("moderatorHint").asText().trim().takeIf(String::isNotBlank)?.take(1000),
        )
    }
}
