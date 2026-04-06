package ru.itplanet.trampline.profile.dao.dto

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.JsonNodeFactory
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.type.SqlTypes
import ru.itplanet.trampline.commons.dao.dto.CityDto
import ru.itplanet.trampline.commons.dao.dto.LocationDto
import ru.itplanet.trampline.commons.model.profile.EmployerProfileModerationStatus
import ru.itplanet.trampline.profile.model.ContactMethod
import ru.itplanet.trampline.profile.model.ProfileLink
import ru.itplanet.trampline.profile.model.enums.VerificationStatus
import java.time.OffsetDateTime

@Entity
@Table(name = "employer_profile")
open class EmployerProfileDto {

    @Id
    @Column(name = "user_id")
    open var userId: Long = 0

    @Column(name = "company_name", length = 255)
    open var companyName: String? = null

    @Column(name = "legal_name", length = 255)
    open var legalName: String? = null

    @Column(name = "inn", length = 12, unique = true)
    open var inn: String? = null

    @Column(name = "description")
    open var description: String? = null

    @Column(name = "industry", length = 255)
    open var industry: String? = null

    @Column(name = "website_url")
    open var websiteUrl: String? = null

    @Column(name = "social_links", columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    open var socialLinks: List<ProfileLink> = emptyList()

    @Column(name = "public_contacts", columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    open var publicContacts: List<ContactMethod> = emptyList()

    @Column(name = "company_size", length = 64)
    open var companySize: String? = null

    @Column(name = "founded_year")
    open var foundedYear: Short? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id")
    open var city: CityDto? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    open var location: LocationDto? = null

    @Column(name = "verification_status", length = 32, nullable = false)
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    open var verificationStatus: VerificationStatus = VerificationStatus.PENDING

    @Column(name = "moderation_status", length = 32, nullable = false)
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    open var moderationStatus: EmployerProfileModerationStatus = EmployerProfileModerationStatus.DRAFT

    @Column(name = "approved_public_snapshot", columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    open var approvedPublicSnapshot: JsonNode = JsonNodeFactory.instance.objectNode()

    @Column(name = "company_moderation_status", length = 32, nullable = false)
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    open var companyModerationStatus: EmployerProfileModerationStatus = EmployerProfileModerationStatus.DRAFT

    @Column(name = "approved_company_snapshot", columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    open var approvedCompanySnapshot: JsonNode = JsonNodeFactory.instance.objectNode()

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    open var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at")
    open var updatedAt: OffsetDateTime? = null

    constructor()

    constructor(userId: Long) {
        this.userId = userId
    }
}
