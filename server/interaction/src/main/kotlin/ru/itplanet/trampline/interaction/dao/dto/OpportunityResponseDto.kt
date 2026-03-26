package ru.itplanet.trampline.interaction.dao.dto

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.OffsetDateTime

@Entity
@Table(name = "opportunity_response")
open class OpportunityResponseDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "user_id", nullable = false)
    open var userId: Long = 0

    @Column(name = "opportunity_id", nullable = false)
    open var opportunityId: Long = 0

    @Column(name = "status", nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    open var status: OpportunityResponseStatus = OpportunityResponseStatus.PENDING

    @Column(name = "comment")
    open var comment: String? = null

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    open var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at")
    open var updatedAt: OffsetDateTime? = null

    constructor() {}

    constructor(userId: Long, opportunityId: Long, comment: String? = null) {
        this.userId = userId
        this.opportunityId = opportunityId
        this.comment = comment
    }
}

enum class OpportunityResponseStatus {
    PENDING,
    ACCEPTED,
    REJECTED,
    RESERVED
}