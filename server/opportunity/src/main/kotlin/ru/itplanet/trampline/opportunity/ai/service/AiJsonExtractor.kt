package ru.itplanet.trampline.opportunity.ai.service

import org.springframework.stereotype.Component

@Component
class AiJsonExtractor {
    fun extractJsonObject(text: String): String {
        val normalizedText = text.trim()
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
