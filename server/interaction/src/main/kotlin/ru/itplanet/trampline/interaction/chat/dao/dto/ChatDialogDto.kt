package ru.itplanet.trampline.interaction.chat.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.OffsetDateTime

@Entity
@Table(name = "chat_dialog")
open class ChatDialogDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "opportunity_response_id", nullable = false, unique = true)
    var opportunityResponseId: Long = 0

    @Column(name = "opportunity_id", nullable = false)
    var opportunityId: Long = 0

    @Column(name = "applicant_user_id", nullable = false)
    var applicantUserId: Long = 0

    @Column(name = "employer_user_id", nullable = false)
    var employerUserId: Long = 0

    @Column(name = "opportunity_title_snapshot", nullable = false, length = 200)
    var opportunityTitleSnapshot: String = ""

    @Column(name = "company_name_snapshot", nullable = false, length = 255)
    var companyNameSnapshot: String = ""

    @Column(name = "applicant_name_snapshot", nullable = false, length = 255)
    var applicantNameSnapshot: String = ""

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    var status: ChatDialogStatus = ChatDialogStatus.OPEN

    @Column(name = "last_message_id")
    var lastMessageId: Long? = null

    @Column(name = "last_message_preview", length = 300)
    var lastMessagePreview: String? = null

    @Column(name = "last_message_at")
    var lastMessageAt: OffsetDateTime? = null

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime? = null

    constructor()

    constructor(
        opportunityResponseId: Long,
        opportunityId: Long,
        applicantUserId: Long,
        employerUserId: Long,
        opportunityTitleSnapshot: String,
        companyNameSnapshot: String,
        applicantNameSnapshot: String,
    ) {
        this.opportunityResponseId = opportunityResponseId
        this.opportunityId = opportunityId
        this.applicantUserId = applicantUserId
        this.employerUserId = employerUserId
        this.opportunityTitleSnapshot = opportunityTitleSnapshot
        this.companyNameSnapshot = companyNameSnapshot
        this.applicantNameSnapshot = applicantNameSnapshot
    }
}

enum class ChatDialogStatus {
    OPEN,
    CLOSED,
}
