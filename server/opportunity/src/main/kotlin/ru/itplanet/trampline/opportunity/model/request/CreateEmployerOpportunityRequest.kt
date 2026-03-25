package ru.itplanet.trampline.opportunity.model.request

import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import ru.itplanet.trampline.opportunity.model.enums.EmploymentType
import ru.itplanet.trampline.opportunity.model.enums.Grade
import ru.itplanet.trampline.opportunity.model.enums.OpportunityType
import ru.itplanet.trampline.opportunity.model.enums.WorkFormat
import java.time.LocalDate
import java.time.OffsetDateTime

data class CreateEmployerOpportunityRequest(
    @field:NotBlank
    @field:Size(max = 200)
    val title: String,

    @field:NotBlank
    @field:Size(max = 1000)
    val shortDescription: String,

    val fullDescription: String? = null,

    val requirements: String? = null,

    @field:NotBlank
    @field:Size(max = 200)
    val companyName: String,

    val type: OpportunityType,
    val workFormat: WorkFormat,
    val employmentType: EmploymentType? = null,
    val grade: Grade? = null,

    @field:Min(0)
    val salaryFrom: Int? = null,

    @field:Min(0)
    val salaryTo: Int? = null,

    @field:NotBlank
    @field:Pattern(regexp = "^[A-Za-z]{3}$")
    val salaryCurrency: String = "RUB",

    val expiresAt: OffsetDateTime? = null,
    val eventDate: LocalDate? = null,

    @field:Positive
    val cityId: Long? = null,

    @field:Positive
    val locationId: Long? = null,

    @field:Valid
    val contactInfo: CreateEmployerOpportunityContactInfoRequest = CreateEmployerOpportunityContactInfoRequest(),

    @field:Valid
    val resourceLinks: List<CreateEmployerOpportunityResourceLinkRequest> = emptyList(),

    val tagIds: List<@Positive Long> = emptyList()
)
