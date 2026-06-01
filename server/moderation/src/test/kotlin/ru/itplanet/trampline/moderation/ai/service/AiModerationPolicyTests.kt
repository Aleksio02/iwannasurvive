package ru.itplanet.trampline.moderation.ai.service

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.moderation.ai.config.AiModerationProperties

class AiModerationPolicyTests {
    @Test
    fun `ai moderation is disabled by default`() {
        assertFalse(AiModerationPolicy(AiModerationProperties()).isEnabled())
    }

    @Test
    fun `opportunity review is supported when enabled`() {
        val policy = AiModerationPolicy(AiModerationProperties(enabled = true))

        assertTrue(policy.isSupported(ModerationEntityType.OPPORTUNITY, ModerationTaskType.OPPORTUNITY_REVIEW))
        assertFalse(policy.isSupported(ModerationEntityType.OPPORTUNITY, ModerationTaskType.CONTENT_REVIEW))
    }
}
