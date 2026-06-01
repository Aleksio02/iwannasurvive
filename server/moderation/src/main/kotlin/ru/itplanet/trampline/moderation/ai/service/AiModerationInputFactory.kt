package ru.itplanet.trampline.moderation.ai.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ObjectNode
import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.moderation.ai.config.AiModerationProperties
import ru.itplanet.trampline.moderation.ai.model.AiModerationInput

@Component
class AiModerationInputFactory(
    private val objectMapper: ObjectMapper,
    private val properties: AiModerationProperties,
) {
    fun create(entityType: ModerationEntityType, snapshot: JsonNode): AiModerationInput {
        val source = unwrap(snapshot)
        val fields = objectMapper.createObjectNode()
        when (entityType) {
            ModerationEntityType.OPPORTUNITY -> {
                copySanitized(source, fields, "title", "shortDescription", "fullDescription", "requirements",
                    "type", "workFormat", "employmentType", "grade", "salaryFrom", "salaryTo",
                    "salaryCurrency", "resourceLinks")
                fields.set<ObjectNode>("contactInfo", objectMapper.createObjectNode().apply {
                    put("hasEmail", containsContact(source, EMAIL_REGEX))
                    put("hasPhone", containsContact(source, PHONE_REGEX))
                    put("hasMessenger", containsContact(source, MESSENGER_REGEX))
                })
            }
            ModerationEntityType.APPLICANT_PROFILE ->
                copySanitized(source, fields, "about", "resumeText", "portfolioLinks", "contactLinks",
                    "profileVisibility", "resumeVisibility", "openToWork", "openToEvents", "skills", "interests", "tags")
            ModerationEntityType.EMPLOYER_PROFILE ->
                copySanitized(source, fields, "companyName", "description", "industry", "websiteUrl",
                    "socialLinks", "publicContacts", "companySize", "foundedYear")
            ModerationEntityType.EMPLOYER_VERIFICATION -> {
                copySanitized(source, fields, "verificationMethod", "professionalLinks", "submittedComment", "companyName", "inn")
                fields.put("hasInn", source.path("inn").asText().isNotBlank())
                val email = source.path("corporateEmail").asText("")
                email.substringAfter("@", "").trim().lowercase()
                    .takeIf { DOMAIN_REGEX.matches(it) }
                    ?.let { fields.put("corporateEmailDomain", it) }
            }
            ModerationEntityType.TAG -> copySanitized(source, fields, "name", "category", "createdByType", "description")
        }
        if (fields.toString().length <= properties.maxInputChars) {
            return AiModerationInput(fields)
        }
        return AiModerationInput(objectMapper.createObjectNode().apply {
            put("truncatedContent", fields.toString().take((properties.maxInputChars - 100).coerceAtLeast(100)))
            put("truncated", true)
        })
    }

    private fun unwrap(snapshot: JsonNode): JsonNode = snapshot.path("snapshot").takeIf { !it.isMissingNode } ?: snapshot
    private fun copySanitized(source: JsonNode, target: ObjectNode, vararg names: String) =
        names.forEach { name -> source.get(name)?.takeUnless { it.isNull }?.let { target.set<JsonNode>(name, sanitize(it)) } }
    private fun sanitize(node: JsonNode): JsonNode = when {
        node.isTextual -> objectMapper.nodeFactory.textNode(sanitizeText(node.asText()))
        node.isArray -> objectMapper.createArrayNode().also { array -> node.forEach { array.add(sanitize(it)) } }
        node.isObject -> objectMapper.createObjectNode().also { result ->
            node.properties().forEach { (key, value) ->
                result.set<JsonNode>(
                    key,
                    if (SENSITIVE_FIELD_REGEX.containsMatchIn(key)) objectMapper.nodeFactory.textNode("[redacted]") else sanitize(value),
                )
            }
        }
        else -> node.deepCopy()
    }

    private fun sanitizeText(value: String): String = value
        .replace(EMAIL_REGEX, "[email]")
        .replace(PHONE_REGEX, "[phone]")
        .replace(MESSENGER_LINK_REGEX, "[messenger]")
        .replace(MESSENGER_ACCOUNT_REGEX, "$1 [messenger-account]")
        .replace(URL_REGEX) { match -> match.value.substringBefore("?").substringBefore("#") }
        .replace(SECRET_QUERY_PARAM_REGEX, "$1[redacted]")
    private fun containsContact(source: JsonNode, regex: Regex): Boolean = regex.containsMatchIn(source.toString())

    companion object {
        private val EMAIL_REGEX = Regex("""[\w.+-]+@[\w.-]+\.[A-Za-zА-Яа-я]{2,}""")
        private val PHONE_REGEX = Regex("""(?:\+?\d[\d\s()\-]{7,}\d)""")
        private val MESSENGER_REGEX = Regex("""(?i)(telegram|телеграм|whatsapp|ватсап|viber|t\.me/)""")
        private val MESSENGER_LINK_REGEX = Regex("""(?i)(?:https?://)?t\.me/\S+""")
        private val MESSENGER_ACCOUNT_REGEX = Regex("""(?i)\b(telegram|телеграм|whatsapp|ватсап|viber)\s*[:@]\s*@?[\w.+-]{3,}""")
        private val URL_REGEX = Regex("""https?://[^\s"'<>]+""")
        private val SECRET_QUERY_PARAM_REGEX = Regex("""(?i)(\b(?:token|api[_-]?key|secret|password|authorization)\s*[=:]\s*)[^\s,;]+""")
        private val SENSITIVE_FIELD_REGEX = Regex("""(?i)(password|secret|token|api[_-]?key|authorization|credential)""")
        private val DOMAIN_REGEX = Regex("""^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$""")
    }
}
