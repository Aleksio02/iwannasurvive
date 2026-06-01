package ru.itplanet.trampline.moderation.ai.dao.dto

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.JsonNodeFactory
import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.moderation.ai.model.*
import ru.itplanet.trampline.moderation.dao.dto.ModerationTaskDto
import java.time.OffsetDateTime

@Entity
@Table(name = "ai_moderation_analysis")
open class AiModerationAnalysisDto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "task_id", nullable = false)
    lateinit var task: ModerationTaskDto
    @Column(name = "task_id", insertable = false, updatable = false)
    var taskId: Long? = null
    @Enumerated(EnumType.STRING) @Column(name = "entity_type", nullable = false)
    lateinit var entityType: ModerationEntityType
    @Column(name = "entity_id", nullable = false) var entityId: Long = 0
    @Enumerated(EnumType.STRING) @Column(name = "task_type", nullable = false)
    lateinit var taskType: ModerationTaskType
    @Column(nullable = false) var provider: String = "YANDEX_GPT"
    @Column(name = "model_uri", nullable = false) var modelUri: String = ""
    @Column(name = "model_version") var modelVersion: String? = null
    @Column(nullable = false) var endpoint: String = ""
    @Column(name = "prompt_version", nullable = false) var promptVersion: String = ""
    @Column(name = "input_hash", nullable = false) var inputHash: String = ""
    @Enumerated(EnumType.STRING) @Column(nullable = false) var status: AiModerationStatus = AiModerationStatus.PENDING
    @Enumerated(EnumType.STRING) var verdict: AiModerationVerdict? = null
    @Column(name = "risk_score") var riskScore: Int? = null
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb", nullable = false)
    var categories: JsonNode = JsonNodeFactory.instance.arrayNode()
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb", nullable = false)
    var reasons: JsonNode = JsonNodeFactory.instance.arrayNode()
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "highlighted_fields", columnDefinition = "jsonb", nullable = false)
    var highlightedFields: JsonNode = JsonNodeFactory.instance.arrayNode()
    @Column(name = "moderator_hint") var moderatorHint: String? = null
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "raw_response", columnDefinition = "jsonb")
    var rawResponse: JsonNode? = null
    @Column(name = "error_message") var errorMessage: String? = null
    @Column(nullable = false) var attempts: Int = 0
    @Column(name = "created_at", nullable = false) lateinit var createdAt: OffsetDateTime
    @Column(name = "updated_at", nullable = false) lateinit var updatedAt: OffsetDateTime
    @Column(name = "finished_at") var finishedAt: OffsetDateTime? = null
}
