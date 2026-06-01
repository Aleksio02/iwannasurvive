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
                copy(source, fields, "about", "resumeText", "portfolioLinks", "contactLinks",
                    "profileVisibility", "resumeVisibility", "openToWork", "openToEvents", "skills", "interests", "tags")
            ModerationEntityType.EMPLOYER_PROFILE ->
                copy(source, fields, "companyName", "description", "industry", "websiteUrl",
                    "socialLinks", "publicContacts", "companySize", "foundedYear")
            ModerationEntityType.EMPLOYER_VERIFICATION -> {
                copy(source, fields, "verificationMethod", "professionalLinks", "submittedComment", "companyName", "inn")
                fields.put("hasInn", source.path("inn").asText().isNotBlank())
                val email = source.path("corporateEmail").asText("")
                email.substringAfter("@", "").takeIf { it.isNotBlank() }?.let { fields.put("corporateEmailDomain", it) }
            }
            ModerationEntityType.TAG -> copy(source, fields, "name", "category", "createdByType", "description")
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
    private fun copy(source: JsonNode, target: ObjectNode, vararg names: String) =
        names.forEach { name -> source.get(name)?.takeUnless { it.isNull }?.let { target.set<JsonNode>(name, it.deepCopy()) } }
    private fun copySanitized(source: JsonNode, target: ObjectNode, vararg names: String) =
        names.forEach { name -> source.get(name)?.takeUnless { it.isNull }?.let { target.set<JsonNode>(name, sanitize(it)) } }
    private fun sanitize(node: JsonNode): JsonNode = when {
        node.isTextual -> objectMapper.nodeFactory.textNode(
            node.asText().replace(EMAIL_REGEX, "[email]").replace(PHONE_REGEX, "[phone]").replace(MESSENGER_LINK_REGEX, "[messenger]")
        )
        node.isArray -> objectMapper.createArrayNode().also { array -> node.forEach { array.add(sanitize(it)) } }
        node.isObject -> objectMapper.createObjectNode().also { result ->
            node.properties().forEach { (key, value) -> result.set<JsonNode>(key, sanitize(value)) }
        }
        else -> node.deepCopy()
    }
    private fun containsContact(source: JsonNode, regex: Regex): Boolean = regex.containsMatchIn(source.toString())

    companion object {
        private val EMAIL_REGEX = Regex("""[\w.+-]+@[\w.-]+\.[A-Za-zА-Яа-я]{2,}""")
        private val PHONE_REGEX = Regex("""(?:\+?\d[\d\s()\-]{7,}\d)""")
        private val MESSENGER_REGEX = Regex("""(?i)(telegram|телеграм|whatsapp|ватсап|viber|t\.me/)""")
        private val MESSENGER_LINK_REGEX = Regex("""(?i)(?:https?://)?t\.me/\S+""")
    }
}
