package ru.itplanet.trampline.opportunity.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.model.enums.TagCategory

interface TagDao : JpaRepository<TagDto, Long> {

    fun findAllByIsActiveTrueOrderByCategoryAscNameAsc(): List<TagDto>

    fun findAllByIsActiveTrueAndCategoryOrderByNameAsc(category: TagCategory): List<TagDto>
}
