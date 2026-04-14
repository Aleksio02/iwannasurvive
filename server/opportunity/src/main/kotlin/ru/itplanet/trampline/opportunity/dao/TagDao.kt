package ru.itplanet.trampline.opportunity.dao

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.commons.model.enums.TagCategory
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.model.enums.CreatedByType
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus

interface TagDao : JpaRepository<TagDto, Long> {

    fun findAllByIsActiveTrueAndModerationStatusOrderByCategoryAscNameAsc(
        moderationStatus: TagModerationStatus,
    ): List<TagDto>

    fun findAllByIsActiveTrueAndModerationStatusAndCategoryOrderByNameAsc(
        moderationStatus: TagModerationStatus,
        category: TagCategory,
    ): List<TagDto>

    fun findAllByCategoryAndNameIgnoreCaseOrderByIdAsc(
        category: TagCategory,
        name: String,
    ): List<TagDto>

    fun findAllByIdInAndIsActiveTrueAndModerationStatusOrderByNameAsc(
        ids: Collection<Long>,
        moderationStatus: TagModerationStatus,
    ): List<TagDto>

    fun findAllByCreatedByTypeAndCreatedByUserIdOrderByIdDesc(
        createdByType: CreatedByType,
        createdByUserId: Long,
    ): List<TagDto>

    fun findAllByCreatedByTypeAndCreatedByUserIdAndModerationStatusOrderByIdDesc(
        createdByType: CreatedByType,
        createdByUserId: Long,
        moderationStatus: TagModerationStatus,
    ): List<TagDto>

    fun findAllByCreatedByTypeAndCreatedByUserIdAndCategoryOrderByIdDesc(
        createdByType: CreatedByType,
        createdByUserId: Long,
        category: TagCategory,
    ): List<TagDto>

    fun findAllByCreatedByTypeAndCreatedByUserIdAndNameContainingIgnoreCaseOrderByIdDesc(
        createdByType: CreatedByType,
        createdByUserId: Long,
        name: String,
    ): List<TagDto>

    fun findAllByCreatedByTypeAndCreatedByUserIdAndCategoryAndModerationStatusOrderByIdDesc(
        createdByType: CreatedByType,
        createdByUserId: Long,
        category: TagCategory,
        moderationStatus: TagModerationStatus,
    ): List<TagDto>

    fun findByNormalizedName(normalizedName: String): TagDto?

    @Modifying
    @Query("UPDATE TagDto t SET t.usageCount = t.usageCount + 1 WHERE t.id = :id")
    fun incrementUsageCount(@Param("id") id: Long)

    @Modifying
    @Query("UPDATE TagDto t SET t.usageCount = t.usageCount - 1 WHERE t.id = :id AND t.usageCount > 0")
    fun decrementUsageCount(@Param("id") id: Long)

    fun findTop10ByOrderByUsageCountDesc(): List<TagDto>
}
