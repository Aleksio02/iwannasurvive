package ru.itplanet.trampline.moderation.ai.service

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import ru.itplanet.trampline.moderation.ai.config.AiModerationProperties
import ru.itplanet.trampline.moderation.ai.model.AiModerationCategory
import ru.itplanet.trampline.moderation.ai.model.AiModerationVerdict

class AiModerationResultParserTests {
    private val parser = AiModerationResultParser(jacksonObjectMapper(), AiModerationProperties())

    @Test
    fun `parses valid result and ignores unknown category`() {
        val result = parser.parse(
            """{"verdict":"NEEDS_REVIEW","riskScore":62,"categories":["SPAM","UNKNOWN"],"reasons":["Проверить текст"],"highlightedFields":[],"moderatorHint":"Посмотреть вручную"}"""
        )

        assertEquals(AiModerationVerdict.NEEDS_REVIEW, result.verdict)
        assertEquals(62, result.riskScore)
        assertEquals(listOf(AiModerationCategory.SPAM), result.categories)
    }

    @Test
    fun `rejects risk score outside allowed range`() {
        assertThrows(IllegalArgumentException::class.java) {
            parser.parse("""{"verdict":"HIGH_RISK","riskScore":101,"categories":[],"reasons":[],"highlightedFields":[]}""")
        }
    }
}
