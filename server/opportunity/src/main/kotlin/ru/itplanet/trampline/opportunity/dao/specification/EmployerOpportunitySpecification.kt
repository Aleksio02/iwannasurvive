package ru.itplanet.trampline.opportunity.dao.specification

import org.springframework.data.jpa.domain.Specification
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.model.enums.EmployerOpportunityCabinetGroup
import ru.itplanet.trampline.opportunity.model.enums.OpportunityStatus
import ru.itplanet.trampline.opportunity.model.enums.OpportunityType
import ru.itplanet.trampline.opportunity.model.enums.WorkFormat
import ru.itplanet.trampline.opportunity.model.request.GetEmployerOpportunityListRequest

object EmployerOpportunitySpecification {

    fun build(
        employerUserId: Long,
        request: GetEmployerOpportunityListRequest
    ): Specification<OpportunityDto> {
        return Specification.allOf(
            belongsToEmployer(employerUserId),
            hasStatus(request.status),
            hasGroup(request.group),
            hasType(request.type),
            hasWorkFormat(request.workFormat),
            matchesSearch(request.search)
        )
    }

    private fun belongsToEmployer(employerUserId: Long): Specification<OpportunityDto> {
        return Specification { root, _, cb ->
            cb.equal(root.get<Long>("employerUserId"), employerUserId)
        }
    }

    private fun hasStatus(status: OpportunityStatus?): Specification<OpportunityDto> {
        if (status == null) {
            return Specification.unrestricted()
        }

        return Specification { root, _, cb ->
            cb.equal(root.get<OpportunityStatus>("status"), status)
        }
    }

    private fun hasGroup(group: EmployerOpportunityCabinetGroup?): Specification<OpportunityDto> {
        if (group == null) {
            return Specification.unrestricted()
        }

        val statuses = group.statuses()

        return Specification { root, _, _ ->
            root.get<OpportunityStatus>("status").`in`(statuses)
        }
    }

    private fun hasType(type: OpportunityType?): Specification<OpportunityDto> {
        if (type == null) {
            return Specification.unrestricted()
        }

        return Specification { root, _, cb ->
            cb.equal(root.get<OpportunityType>("type"), type)
        }
    }

    private fun hasWorkFormat(workFormat: WorkFormat?): Specification<OpportunityDto> {
        if (workFormat == null) {
            return Specification.unrestricted()
        }

        return Specification { root, _, cb ->
            cb.equal(root.get<WorkFormat>("workFormat"), workFormat)
        }
    }

    private fun matchesSearch(search: String?): Specification<OpportunityDto> {
        val normalized = search?.trim()?.lowercase()
        if (normalized.isNullOrBlank()) {
            return Specification.unrestricted()
        }

        val pattern = "%$normalized%"

        return Specification { root, _, cb ->
            cb.or(
                cb.like(cb.lower(root.get("title")), pattern),
                cb.like(cb.lower(root.get("shortDescription")), pattern),
                cb.like(cb.lower(root.get("companyName")), pattern),
                cb.like(cb.lower(root.get("requirements")), pattern),
                cb.like(cb.lower(root.get("fullDescription")), pattern)
            )
        }
    }
}
