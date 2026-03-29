package ru.itplanet.trampline.interaction.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.OffsetDateTime

@Entity
@Table(name = "favorite")
open class FavoriteDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "user_id", nullable = false)
    open var userId: Long = 0

    @Column(name = "opportunity_id")
    open var opportunityId: Long? = null

    @Column(name = "employer_user_id")
    open var employerUserId: Long? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    open var targetType: FavoriteTargetType = FavoriteTargetType.OPPORTUNITY

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    open var createdAt: OffsetDateTime? = null

    constructor()

    private constructor(
        userId: Long,
        opportunityId: Long?,
        employerUserId: Long?,
        targetType: FavoriteTargetType,
    ) {
        this.userId = userId
        this.opportunityId = opportunityId
        this.employerUserId = employerUserId
        this.targetType = targetType
        validateTargetConsistency()
    }

    @PrePersist
    @PreUpdate
    fun validateTargetConsistency() {
        val hasOpportunity = opportunityId != null
        val hasEmployer = employerUserId != null

        require(hasOpportunity.xor(hasEmployer)) {
            "Favorite must contain exactly one target"
        }

        when (targetType) {
            FavoriteTargetType.OPPORTUNITY -> require(hasOpportunity && !hasEmployer) {
                "OPPORTUNITY favorite must have opportunityId only"
            }

            FavoriteTargetType.EMPLOYER -> require(hasEmployer && !hasOpportunity) {
                "EMPLOYER favorite must have employerUserId only"
            }
        }
    }

    companion object {
        fun forOpportunity(
            userId: Long,
            opportunityId: Long,
        ): FavoriteDto {
            return FavoriteDto(
                userId = userId,
                opportunityId = opportunityId,
                employerUserId = null,
                targetType = FavoriteTargetType.OPPORTUNITY,
            )
        }

        fun forEmployer(
            userId: Long,
            employerUserId: Long,
        ): FavoriteDto {
            return FavoriteDto(
                userId = userId,
                opportunityId = null,
                employerUserId = employerUserId,
                targetType = FavoriteTargetType.EMPLOYER,
            )
        }
    }
}

enum class FavoriteTargetType {
    OPPORTUNITY,
    EMPLOYER,
}
