package ru.itplanet.trampline.interaction.dao.dto

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.OffsetDateTime

@Entity
@Table(name = "applicant_contact", uniqueConstraints = [
    UniqueConstraint(columnNames = ["user_low_id", "user_high_id"])
])
open class ContactDto {
    @EmbeddedId
    open var id: ContactDtoId = ContactDtoId()

    @Column(name = "initiated_by_user_id", nullable = false)
    open var initiatedByUserId: Long? = null

    @Column(name = "status", nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    open var status: ContactStatus = ContactStatus.PENDING

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    open var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at")
    open var updatedAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "responded_at")
    open var respondedAt: OffsetDateTime? = null

    constructor() {}

    constructor(id: ContactDtoId, initiatedByUserId: Long?) {
        this.id = id
        this.initiatedByUserId = initiatedByUserId
    }
}

enum class ContactStatus {
    PENDING,
    ACCEPTED,
    DECLINED,
    BLOCKED
}