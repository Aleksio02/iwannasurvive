package ru.itplanet.trampline.opportunity.ai.service

import org.springframework.stereotype.Component
import ru.itplanet.trampline.opportunity.ai.config.AiOpportunityDescriptionProperties
import ru.itplanet.trampline.opportunity.ai.model.SanitizedAiOpportunityDescriptionInput
import ru.itplanet.trampline.opportunity.model.request.AiOpportunityDescriptionRequest

@Component
class AiOpportunityDescriptionInputSanitizer(
    private val properties: AiOpportunityDescriptionProperties,
) {
    fun sanitize(request: AiOpportunityDescriptionRequest): SanitizedAiOpportunityDescriptionInput {
        var remainingChars = properties.maxInputChars.coerceAtLeast(0)

        fun sanitizeField(value: String?, maxChars: Int = Int.MAX_VALUE): String {
            if (remainingChars == 0) return ""

            val sanitized = value.orEmpty()
                .replace(EMAIL_REGEX, "[email]")
                .replace(MESSENGER_REGEX, "[messenger]")
                .replace(URL_REGEX, "[link]")
                .replace(PHONE_REGEX, "[phone]")
                .replace(WHITESPACE_REGEX, " ")
                .trim()
                .take(maxChars.coerceAtLeast(0))
                .take(remainingChars)

            remainingChars -= sanitized.length
            return sanitized
        }

        fun consumeTrustedField(value: String?): String {
            if (remainingChars == 0) return ""

            val normalized = value.orEmpty()
                .replace(WHITESPACE_REGEX, " ")
                .trim()
                .take(remainingChars)

            remainingChars -= normalized.length
            return normalized
        }

        val salary = buildSalary(request)

        return SanitizedAiOpportunityDescriptionInput(
            title = sanitizeField(request.title),
            typeLabel = consumeTrustedField(typeLabels[request.type]),
            workFormatLabel = consumeTrustedField(workFormatLabels[request.workFormat]),
            employmentTypeLabel = consumeTrustedField(employmentTypeLabels[request.employmentType]),
            gradeLabel = consumeTrustedField(gradeLabels[request.grade]),
            salary = consumeTrustedField(salary),
            cityName = sanitizeField(request.cityName),
            companyName = sanitizeField(request.companyName),
            requirements = sanitizeField(request.requirements),
            notes = sanitizeField(request.notes, properties.maxNotesChars),
        )
    }

    private fun buildSalary(request: AiOpportunityDescriptionRequest): String {
        val currency = request.salaryCurrency?.uppercase()?.takeIf(String::isNotBlank) ?: "RUB"
        return when {
            request.salaryFrom != null && request.salaryTo != null -> "от ${request.salaryFrom} до ${request.salaryTo} $currency"
            request.salaryFrom != null -> "от ${request.salaryFrom} $currency"
            request.salaryTo != null -> "до ${request.salaryTo} $currency"
            else -> ""
        }
    }

    private companion object {
        val typeLabels = mapOf(
            ru.itplanet.trampline.commons.model.enums.OpportunityType.INTERNSHIP to "Стажировка",
            ru.itplanet.trampline.commons.model.enums.OpportunityType.VACANCY to "Вакансия",
            ru.itplanet.trampline.commons.model.enums.OpportunityType.MENTORING to "Менторская программа",
            ru.itplanet.trampline.commons.model.enums.OpportunityType.EVENT to "Мероприятие",
        )
        val workFormatLabels = mapOf(
            ru.itplanet.trampline.commons.model.enums.WorkFormat.OFFICE to "Офис",
            ru.itplanet.trampline.commons.model.enums.WorkFormat.HYBRID to "Гибрид",
            ru.itplanet.trampline.commons.model.enums.WorkFormat.REMOTE to "Удалённо",
            ru.itplanet.trampline.commons.model.enums.WorkFormat.ONLINE to "Онлайн",
        )
        val employmentTypeLabels = mapOf(
            ru.itplanet.trampline.commons.model.enums.EmploymentType.FULL_TIME to "Полная занятость",
            ru.itplanet.trampline.commons.model.enums.EmploymentType.PART_TIME to "Частичная занятость",
            ru.itplanet.trampline.commons.model.enums.EmploymentType.PROJECT to "Проектная занятость",
        )
        val gradeLabels = mapOf(
            ru.itplanet.trampline.commons.model.enums.Grade.INTERN to "Intern",
            ru.itplanet.trampline.commons.model.enums.Grade.JUNIOR to "Junior",
            ru.itplanet.trampline.commons.model.enums.Grade.MIDDLE to "Middle",
            ru.itplanet.trampline.commons.model.enums.Grade.SENIOR to "Senior",
        )
        val EMAIL_REGEX = Regex("""(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b""")
        val URL_REGEX = Regex("""(?i)\b(?:https?://|www\.)\S+""")
        val MESSENGER_REGEX = Regex(
            """(?i)(?:(?:https?://)?(?:t\.me|telegram\.me|wa\.me|whatsapp\.com|discord\.gg|discord\.com|viber\.com)/\S+|@\w{3,}|(?:telegram|телеграм|whatsapp|viber|discord)\s*:?\s*\S*)""",
        )
        val PHONE_REGEX = Regex("""(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)""")
        val WHITESPACE_REGEX = Regex("""\s+""")
    }
}
