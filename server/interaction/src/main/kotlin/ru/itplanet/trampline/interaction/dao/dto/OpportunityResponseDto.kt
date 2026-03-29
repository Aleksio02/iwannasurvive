package ru.itplanet.trampline.interaction.dao.dto

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.JsonNodeFactory
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.type.SqlTypes
import java.time.OffsetDateTime

@Entity
@Table(name = "opportunity_response")
open class OpportunityResponseDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "applicant_user_id", nullable = false)
    open var applicantUserId: Long = 0

    @Column(name = "opportunity_id", nullable = false)
    open var opportunityId: Long = 0

    @Column(name = "cover_letter")
    open var coverLetter: String? = null

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "resume_snapshot", nullable = false, columnDefinition = "jsonb")
    open var resumeSnapshot: JsonNode = JsonNodeFactory.instance.objectNode()

    @Column(name = "resume_file_id")
    open var resumeFileId: Long? = null

    @Column(name = "status", nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    open var status: OpportunityResponseStatus = OpportunityResponseStatus.SUBMITTED

    @Column(name = "employer_comment")
    open var employerComment: String? = null

    @Column(name = "applicant_comment")
    open var applicantComment: String? = null

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    open var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at")
    open var updatedAt: OffsetDateTime? = null

    @Column(name = "responded_at")
    open var respondedAt: OffsetDateTime? = null

    constructor()

    constructor(
        applicantUserId: Long,
        opportunityId: Long,
        applicantComment: String? = null,
        coverLetter: String? = null,
        resumeFileId: Long? = null,
        resumeSnapshot: JsonNode = JsonNodeFactory.instance.objectNode(),
    ) {
        this.applicantUserId = applicantUserId
        this.opportunityId = opportunityId
        this.applicantComment = applicantComment
        this.coverLetter = coverLetter
        this.resumeFileId = resumeFileId
        this.resumeSnapshot = resumeSnapshot
    }
}

enum class OpportunityResponseStatus {
    SUBMITTED,
    IN_REVIEW,
    ACCEPTED,
    REJECTED,
    RESERVE,
    WITHDRAWN,
}
