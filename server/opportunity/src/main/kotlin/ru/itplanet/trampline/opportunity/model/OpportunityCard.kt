package ru.itplanet.trampline.opportunity.model

import ru.itplanet.trampline.opportunity.model.enums.EmploymentType
import ru.itplanet.trampline.opportunity.model.enums.Grade
import ru.itplanet.trampline.opportunity.model.enums.OpportunityType
import ru.itplanet.trampline.opportunity.model.enums.WorkFormat
import java.time.LocalDate
import java.time.OffsetDateTime

data class OpportunityCard(
    val id: Long,
    val title: String,
    val shortDescription: String,
    val requirements: String?,
    val companyName: String,
    val type: OpportunityType,
    val workFormat: WorkFormat,
    val employmentType: EmploymentType?,
    val grade: Grade?,
    val salaryFrom: Int?,
    val salaryTo: Int?,
    val publishedAt: OffsetDateTime,
    val expiresAt: OffsetDateTime?,
    val eventDate: LocalDate?,
    val cityId: Long?,
    val locationId: Long?,
    val contactInfo: String?,
    val resourceLinks: List<String>,
    val tags: List<Tag>
)
