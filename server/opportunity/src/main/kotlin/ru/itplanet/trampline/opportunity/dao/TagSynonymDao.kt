package ru.itplanet.trampline.opportunity.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.opportunity.dao.dto.TagSynonymDto

interface TagSynonymDao : JpaRepository<TagSynonymDto, Long> {
    fun findByNormalizedSynonym(normalizedSynonym: String): TagSynonymDto?
}