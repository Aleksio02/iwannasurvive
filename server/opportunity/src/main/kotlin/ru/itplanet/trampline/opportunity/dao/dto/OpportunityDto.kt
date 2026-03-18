package ru.itplanet.trampline.opportunity.dao.dto

import jakarta.persistence.CollectionTable
import jakarta.persistence.Column
import jakarta.persistence.ElementCollection
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.OrderColumn
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import ru.itplanet.trampline.opportunity.model.enums.EmploymentType
import ru.itplanet.trampline.opportunity.model.enums.Grade
import ru.itplanet.trampline.opportunity.model.enums.OpportunityStatus
import ru.itplanet.trampline.opportunity.model.enums.OpportunityType
import ru.itplanet.trampline.opportunity.model.enums.WorkFormat
import java.time.LocalDate
import java.time.OffsetDateTime

@Entity
@Table(name = "opportunity")
open class OpportunityDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "title", nullable = false, length = 200)
    open var title: String = ""

    @Column(name = "short_description", nullable = false, length = 1000)
    open var shortDescription: String = ""

    @Column(name = "requirements")
    open var requirements: String? = null

    @Column(name = "company_name", nullable = false, length = 200)
    open var companyName: String = ""

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    open var type: OpportunityType = OpportunityType.VACANCY

    @Enumerated(EnumType.STRING)
    @Column(name = "work_format", nullable = false, length = 20)
    open var workFormat: WorkFormat = WorkFormat.OFFICE

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", length = 20)
    open var employmentType: EmploymentType? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "grade", length = 20)
    open var grade: Grade? = null

    @Column(name = "salary_from")
    open var salaryFrom: Int? = null

    @Column(name = "salary_to")
    open var salaryTo: Int? = null

    @Column(name = "published_at", nullable = false)
    open var publishedAt: OffsetDateTime = OffsetDateTime.now()

    @Column(name = "expires_at")
    open var expiresAt: OffsetDateTime? = null

    @Column(name = "event_date")
    open var eventDate: LocalDate? = null

    @Column(name = "city_id")
    open var cityId: Long? = null

    @Column(name = "location_id")
    open var locationId: Long? = null

    @Column(name = "contact_info")
    open var contactInfo: String? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    open var status: OpportunityStatus = OpportunityStatus.DRAFT

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
        name = "opportunity_resource_link",
        joinColumns = [JoinColumn(name = "opportunity_id")]
    )
    @OrderColumn(name = "sort_order")
    @Column(name = "url", nullable = false)
    open var resourceLinks: MutableList<String> = mutableListOf()

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "opportunity_tag",
        joinColumns = [JoinColumn(name = "opportunity_id")],
        inverseJoinColumns = [JoinColumn(name = "tag_id")]
    )
    open var tags: MutableSet<TagDto> = linkedSetOf()

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    open var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    open var updatedAt: OffsetDateTime? = null
}
