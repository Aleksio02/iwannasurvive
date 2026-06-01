package ru.itplanet.trampline.moderation.ai.service

import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.moderation.ai.model.AiModerationCategory
import ru.itplanet.trampline.moderation.ai.model.AiModerationInput

@Component
class AiModerationPromptFactory {
    fun systemPrompt(): String = """
        Ты помощник куратора карьерной платформы "Трамплин". Выполни только предварительную оценку рисков модерации.
        Не одобряй и не отклоняй сущность, не выдумывай факты, анализируй только переданные поля.
        Не оценивай качество или трудоустраиваемость кандидата и не делай юридических выводов о компании.
        Не восстанавливай замаскированные значения и не включай персональные данные или секреты в ответ.
        Верни ровно один валидный JSON-объект без Markdown, code fences, комментариев и текста до или после JSON.
        Используй только перечисленные ключи схемы. Не добавляй новые ключи. Все строки ответа пиши на русском языке.
        Причины должны быть короткими, практичными и основанными только на переданных полях.
    """.trimIndent()

    fun userPrompt(entityType: ModerationEntityType, taskType: ModerationTaskType, input: AiModerationInput): String = """
        entityType: ${entityType.name}
        taskType: ${taskType.name}
        Допустимые verdict: LOW_RISK, NEEDS_REVIEW, HIGH_RISK
        Допустимые categories: ${AiModerationCategory.entries.joinToString(", ") { it.name }}
        Поля для анализа: ${input.fields}
        Верни только JSON-объект следующей формы:
        {"verdict":"LOW_RISK","riskScore":0,"categories":[],"reasons":[],"highlightedFields":[],"moderatorHint":""}
        Правила формата:
        - verdict: ровно одно значение из списка допустимых verdict;
        - riskScore: целое число от 0 до 100;
        - categories: массив значений только из списка допустимых categories;
        - reasons: массив коротких строк;
        - highlightedFields: массив объектов вида {"field":"имя поля","issue":"краткое замечание"};
        - moderatorHint: короткая строка;
        - если рисков нет, верни LOW_RISK, небольшой riskScore и пустые массивы.
    """.trimIndent()
}
