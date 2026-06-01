package ru.itplanet.trampline.opportunity.ai.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Component
import ru.itplanet.trampline.opportunity.ai.config.AiTagSuggestionProperties
import ru.itplanet.trampline.opportunity.ai.model.AllowedTag
import ru.itplanet.trampline.opportunity.ai.model.SanitizedAiTagSuggestionInput

@Component
class AiTagSuggestionPromptFactory(
    private val objectMapper: ObjectMapper,
    private val properties: AiTagSuggestionProperties,
) {
    fun systemPrompt(): String = """
        Ты помощник для подбора тегов публикации на карьерной платформе "Трамплин".
        Твоя задача — выбрать подходящие теги только из переданного справочника allowedTags.
        Нельзя придумывать новые теги.
        Нельзя возвращать id, которых нет в allowedTags.
        Нельзя исправлять, переводить или переименовывать теги.
        Нельзя создавать варианты вроде JS/javascript/Джаваскрипт.
        Не добавляй общие теги без основания.
        Анализируй только title, shortDescription, fullDescription и requirements.
        Верни ровно один валидный JSON-объект.
        Без Markdown, code fences, комментариев и текста до или после JSON.
    """.trimIndent()

    fun userPrompt(input: SanitizedAiTagSuggestionInput, allowedTags: List<AllowedTag>): String = """
        title: ${input.title}
        shortDescription: ${input.shortDescription}
        fullDescription: ${input.fullDescription}
        requirements: ${input.requirements}

        allowedTags:
        ${objectMapper.writeValueAsString(allowedTags)}

        Верни JSON:
        {"tags":[{"id":12,"confidence":0.96,"reason":"В требованиях указан Kotlin"}]}

        Правила:
        - id только из allowedTags;
        - confidence число от 0 до 1;
        - максимум ${properties.maxSuggestions} тегов;
        - если подходящих тегов нет, верни {"tags":[]};
        - reason короткий, на русском;
        - не добавляй name в ответ, backend возьмёт name из БД.
    """.trimIndent()
}
