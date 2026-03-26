package ru.itplanet.trampline.interaction.dao.dto

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.OffsetDateTime

@Entity
@Table(name = "favorite", uniqueConstraints = [
    UniqueConstraint(columnNames = ["user_id", "opportunity_id"])
])
open class FavoriteDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "user_id", nullable = false)
    open var userId: Long = 0

    @Column(name = "opportunity_id", nullable = false)
    open var opportunityId: Long = 0

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    open var createdAt: OffsetDateTime? = null

    constructor() {}

    constructor(userId: Long, opportunityId: Long) {
        this.userId = userId
        this.opportunityId = opportunityId
    }
}