package ru.itplanet.trampline.opportunity.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.commons.model.Tag

@Component
class TagConverter {

    fun toModel(source: TagDto): Tag {
        return Tag(
            id = requireNotNull(source.id),
            name = source.name,
            category = source.category
        )
    }
}
