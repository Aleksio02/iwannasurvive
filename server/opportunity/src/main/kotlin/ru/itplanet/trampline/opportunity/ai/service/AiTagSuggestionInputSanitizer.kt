package ru.itplanet.trampline.opportunity.ai.service

import org.springframework.stereotype.Component
import ru.itplanet.trampline.opportunity.ai.config.AiTagSuggestionProperties
import ru.itplanet.trampline.opportunity.ai.model.SanitizedAiTagSuggestionInput
import ru.itplanet.trampline.opportunity.model.request.AiTagSuggestionRequest

@Component
class AiTagSuggestionInputSanitizer(
    private val properties: AiTagSuggestionProperties,
) {
    fun sanitize(request: AiTagSuggestionRequest): SanitizedAiTagSuggestionInput {
        var remainingChars = properties.maxInputChars.coerceAtLeast(0)

        fun sanitizeField(value: String?): String {
            if (remainingChars == 0) return ""

            val sanitized = value.orEmpty()
                .replace(EMAIL_REGEX, "[email]")
                .replace(URL_REGEX, "[link]")
                .replace(MESSENGER_REGEX, "[messenger]")
                .replace(PHONE_REGEX, "[phone]")
                .replace(WHITESPACE_REGEX, " ")
                .trim()
                .take(remainingChars)

            remainingChars -= sanitized.length
            return sanitized
        }

        return SanitizedAiTagSuggestionInput(
            title = sanitizeField(request.title),
            shortDescription = sanitizeField(request.shortDescription),
            fullDescription = sanitizeField(request.fullDescription),
            requirements = sanitizeField(request.requirements),
        )
    }

    private companion object {
        val EMAIL_REGEX = Regex("""(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b""")
        val URL_REGEX = Regex("""(?i)\b(?:https?://|www\.)\S+""")
        val MESSENGER_REGEX = Regex("""(?i)(?:@\w{3,}|\bt\.me/\S+|(?:telegram|телеграм|whatsapp|viber|discord)\s*:?\s*\S*)""")
        val PHONE_REGEX = Regex("""(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)""")
        val WHITESPACE_REGEX = Regex("""\s+""")
    }
}
