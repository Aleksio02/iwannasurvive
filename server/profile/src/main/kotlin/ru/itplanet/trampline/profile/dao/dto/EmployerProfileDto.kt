package ru.itplanet.trampline.profile.dao.dto

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

    constructor(
        userId: Long,
        companyName: String?,
        legalName: String? = null,
        inn: String?,
        description: String? = null,
        industry: String? = null,
        websiteUrl: String? = null,
        socialLinks: List<ProfileLink> = emptyList(),
        publicContacts: List<ContactMethod> = emptyList(),
        companySize: String? = null,
        foundedYear: Short? = null,
        city: CityDto? = null,
        location: LocationDto? = null,
        verificationStatus: VerificationStatus = VerificationStatus.PENDING,
        createdAt: OffsetDateTime? = null,
        updatedAt: OffsetDateTime? = null,
    ) {
        this.userId = userId
        this.companyName = companyName
        this.legalName = legalName
        this.inn = inn
        this.description = description
        this.industry = industry
        this.websiteUrl = websiteUrl
        this.socialLinks = socialLinks
        this.publicContacts = publicContacts
        this.companySize = companySize
        this.foundedYear = foundedYear
        this.city = city
        this.location = location
        this.verificationStatus = verificationStatus
        this.createdAt = createdAt
        this.updatedAt = updatedAt
    }
}
