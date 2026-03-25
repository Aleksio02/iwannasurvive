package ru.itplanet.trampline.interaction.dao.dto

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.OffsetDateTime

@Entity
@Table(name = "contact", uniqueConstraints = [
    UniqueConstraint(columnNames = ["user_id", "contact_user_id"])
])
open class ContactDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "user_id", nullable = false)
    open var userId: Long = 0

    @Column(name = "contact_user_id", nullable = false)
    open var contactUserId: Long = 0

    @Column(name = "status", nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    open var status: ContactStatus = ContactStatus.PENDING

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    open var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at")
    open var updatedAt: OffsetDateTime? = null

    constructor() {}

    constructor(userId: Long, contactUserId: Long) {
        this.userId = userId
        this.contactUserId = contactUserId
    }
}

enum class ContactStatus {
    PENDING,   // ожидает подтверждения
    ACCEPTED,  // друзья
    BLOCKED
}