package ru.itplanet.trampline.opportunity.ai.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.model.Tag
import ru.itplanet.trampline.opportunity.ai.config.AiResumeAnalysisProperties
import ru.itplanet.trampline.opportunity.ai.model.ResumeAnalysisCandidateTag

@Component
class AiResumeAnalysisPromptFactory(
    private val objectMapper: ObjectMapper,
    private val properties: AiResumeAnalysisProperties,
) {
    fun systemPrompt(): String = """
        Ты помощник карьерной платформы.
        Анализируешь текст резюме соискателя.
        Используй только переданные данные.
        Не выдумывай опыт, проекты, должности и коммерческую практику.
        Не добавляй персональные данные.
        Выбирай теги только из списка candidateTags.
        Ответ строго JSON.
        Без Markdown, code fences, комментариев и текста до или после JSON.
        Ответ должен начинаться с символа { и заканчиваться символом }.
    """.trimIndent()

    fun userPrompt(
        redactedResumeText: String,
        candidateTags: List<ResumeAnalysisCandidateTag>,
        currentProfileSkills: List<Tag>,
        currentProfileInterests: List<Tag>,
    ): String = """
        promptVersion: ${properties.promptVersion}

        redactedResumeText:
        $redactedResumeText

        candidateTags:
        ${objectMapper.writeValueAsString(candidateTags)}

        currentProfileSkills:
        ${objectMapper.writeValueAsString(currentProfileSkills.map { it.name })}

        currentProfileInterests:
        ${objectMapper.writeValueAsString(currentProfileInterests.map { it.name })}

        Верни JSON:
        {
          "summary": "короткая строка",
          "detectedSkills": ["строка"],
          "suggestedSkillTags": [
            { "name": "Java", "confidence": 90 }
          ],
          "suggestedInterestTags": [
            { "name": "Backend", "confidence": 80 }
          ],
          "strengths": ["строка"],
          "improvementTips": ["строка"]
        }

        Правила:
        - suggestedSkillTags только TECH из candidateTags;
        - suggestedInterestTags только DIRECTION из candidateTags;
        - confidence целое число 0..100;
        - максимум ${properties.maxSuggestedSkills} suggestedSkillTags;
        - максимум ${properties.maxSuggestedInterests} suggestedInterestTags;
        - максимум ${properties.maxStrengths} strengths;
        - максимум ${properties.maxImprovementTips} improvementTips;
        - detectedSkills — только навыки, явно найденные в резюме;
        - не возвращай email, телефон, ссылки и другие персональные данные;
        - не придумывай коммерческий опыт, если его нет в резюме;
        - ответ должен начинаться с символа { и заканчиваться символом }.
    """.trimIndent()
}
