package ru.itplanet.trampline.moderation.ai.model

import com.fasterxml.jackson.databind.JsonNode
import java.time.OffsetDateTime

enum class AiModerationStatus { PENDING, PROCESSING, SUCCESS, FAILED, SKIPPED }
enum class AiModerationVerdict { LOW_RISK, NEEDS_REVIEW, HIGH_RISK }
enum class AiModerationCategory {
    SPAM, SCAM, TOXIC_CONTENT, DISCRIMINATION, ADULT_CONTENT, EXTERNAL_CONTACTS,
    SUSPICIOUS_SALARY, PERSONAL_DATA_EXPOSURE, MISLEADING_DESCRIPTION,
    LOW_QUALITY_CONTENT, IRRELEVANT_CONTENT, DUPLICATE_OR_BAD_TAG, VERIFICATION_MISMATCH
}

data class AiModerationFieldIssue(val field: String, val issue: String)
data class AiModerationResult(
    val verdict: AiModerationVerdict,
    val riskScore: Int,
    val categories: List<AiModerationCategory>,
    val reasons: List<String>,
    val highlightedFields: List<AiModerationFieldIssue>,
    val moderatorHint: String?,
)
data class AiModerationInput(val fields: JsonNode)
data class AiModerationAnalysisResponse(
    val status: AiModerationStatus,
    val verdict: AiModerationVerdict?,
    val riskScore: Int?,
    val categories: List<AiModerationCategory>,
    val reasons: List<String>,
    val highlightedFields: List<AiModerationFieldIssue>,
    val moderatorHint: String?,
    val modelVersion: String?,
    val promptVersion: String,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
    val finishedAt: OffsetDateTime?,
    val errorMessage: String?,
)
