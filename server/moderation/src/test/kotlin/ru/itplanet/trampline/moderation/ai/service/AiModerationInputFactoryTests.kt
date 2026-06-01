package ru.itplanet.trampline.moderation.ai.service

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.moderation.ai.config.AiModerationProperties

class AiModerationInputFactoryTests {
    private val objectMapper = jacksonObjectMapper()
    private val factory = AiModerationInputFactory(objectMapper, AiModerationProperties())

    @Test
    fun `opportunity input replaces raw contacts with flags`() {
        val input = factory.create(
            ModerationEntityType.OPPORTUNITY,
            objectMapper.readTree(
                """{"title":"Пишите в Telegram","shortDescription":"mail@example.org +7 999 123-45-67"}"""
            ),
        ).fields.toString()

        assertTrue(input.contains("hasEmail"))
        assertTrue(input.contains("hasPhone"))
        assertTrue(input.contains("hasMessenger"))
        assertFalse(input.contains("mail@example.org"))
        assertFalse(input.contains("+7 999 123-45-67"))
    }
}
