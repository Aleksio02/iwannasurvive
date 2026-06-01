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
        Не включай секретные значения. Верни только валидный JSON без Markdown. Пиши краткие практичные причины на русском языке.
    """.trimIndent()

    fun userPrompt(entityType: ModerationEntityType, taskType: ModerationTaskType, input: AiModerationInput): String = """
        entityType: ${entityType.name}
        taskType: ${taskType.name}
        Допустимые категории: ${AiModerationCategory.entries.joinToString(",") { it.name }}
        Поля для анализа: ${input.fields}
        Верни JSON:
        {"verdict":"LOW_RISK | NEEDS_REVIEW | HIGH_RISK","riskScore":0,"categories":[],"reasons":[],"highlightedFields":[{"field":"","issue":""}],"moderatorHint":""}
    """.trimIndent()
}
