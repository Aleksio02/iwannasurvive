package ru.itplanet.trampline.opportunity.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.model.TagSynonym
import ru.itplanet.trampline.opportunity.dao.dto.TagSynonymDto

@Component
class TagSynonymConverter(
    private val tagConverter: TagConverter
) {
    fun toModel(source: TagSynonymDto): TagSynonym {
        return TagSynonym(
            id = requireNotNull(source.id),
            tag = tagConverter.toModel(source.tag!!),
            tagId = source.tag!!.id!!,
            synonym = source.synonym,
            normalizedSynonym = source.normalizedSynonym
        )
    }
}
