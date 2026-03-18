package ru.itplanet.trampline.opportunity.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.model.OpportunityCard
import ru.itplanet.trampline.opportunity.model.OpportunityListItem

@Component
class OpportunityConverter(
    private val tagConverter: TagConverter
) {

    fun toListItem(source: OpportunityDto): OpportunityListItem {
        return OpportunityListItem(
            id = requireNotNull(source.id),
            title = source.title,
            shortDescription = source.shortDescription,
            companyName = source.companyName,
            type = source.type,
            workFormat = source.workFormat,
            employmentType = source.employmentType,
            grade = source.grade,
            salaryFrom = source.salaryFrom,
            salaryTo = source.salaryTo,
            publishedAt = source.publishedAt,
            expiresAt = source.expiresAt,
            eventDate = source.eventDate,
            cityId = source.cityId,
            locationId = source.locationId,
            tags = source.tags
                .filter { it.isActive }
                .sortedTags()
                .map(tagConverter::toModel)
        )
    }

    fun toCard(source: OpportunityDto): OpportunityCard {
        return OpportunityCard(
            id = requireNotNull(source.id),
            title = source.title,
            shortDescription = source.shortDescription,
            requirements = source.requirements,
            companyName = source.companyName,
            type = source.type,
            workFormat = source.workFormat,
            employmentType = source.employmentType,
            grade = source.grade,
            salaryFrom = source.salaryFrom,
            salaryTo = source.salaryTo,
            publishedAt = source.publishedAt,
            expiresAt = source.expiresAt,
            eventDate = source.eventDate,
            cityId = source.cityId,
            locationId = source.locationId,
            contactInfo = source.contactInfo,
            resourceLinks = source.resourceLinks.toList(),
            tags = source.tags
                .filter { it.isActive }
                .sortedTags()
                .map(tagConverter::toModel)
        )
    }

    private fun Iterable<TagDto>.sortedTags(): List<TagDto> {
        return this.sortedWith(compareBy<TagDto>({ it.category.name }, { it.name.lowercase() }))
    }
}
