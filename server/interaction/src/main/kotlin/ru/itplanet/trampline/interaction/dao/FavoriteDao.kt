package ru.itplanet.trampline.interaction.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.dao.dto.FavoriteDto

interface FavoriteDao : JpaRepository<FavoriteDto, Long> {
    fun findByUserId(userId: Long): List<FavoriteDto>
    fun deleteByUserIdAndOpportunityId(userId: Long, opportunityId: Long)
    fun existsByUserIdAndOpportunityId(userId: Long, opportunityId: Long): Boolean
}