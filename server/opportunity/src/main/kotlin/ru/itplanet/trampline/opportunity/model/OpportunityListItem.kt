package ru.itplanet.trampline.opportunity.model

import ru.itplanet.trampline.commons.model.City
import ru.itplanet.trampline.commons.model.Location
import ru.itplanet.trampline.commons.model.Tag
import ru.itplanet.trampline.commons.model.enums.EmploymentType
import ru.itplanet.trampline.commons.model.enums.Grade
import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.commons.model.enums.WorkFormat
import java.time.LocalDate
import java.time.OffsetDateTime

data class OpportunityListItem(
    val id: Long,
    val employerUserId: Long?,
    val title: String,
    val shortDescription: String,
    val companyName: String,
    val employerVerified: Boolean = false,
    val employerVerificationStatus: String? = null,
    val type: OpportunityType,
    val workFormat: WorkFormat,
    val employmentType: EmploymentType?,
    val grade: Grade?,
    val salaryFrom: Int?,
    val salaryTo: Int?,
    val salaryCurrency: String,
    val publishedAt: OffsetDateTime?,
    val expiresAt: OffsetDateTime?,
    val eventDate: LocalDate?,
    val city: City?,
    val locationPreview: Location?,
    val tags: List<Tag>
)
