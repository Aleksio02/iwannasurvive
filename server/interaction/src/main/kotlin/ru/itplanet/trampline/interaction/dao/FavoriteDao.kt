package ru.itplanet.trampline.interaction.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.dao.dto.FavoriteDto

interface FavoriteDao : JpaRepository<FavoriteDto, Long> {
    fun findByUserIdOrderByCreatedAtDescIdDesc(userId: Long): List<FavoriteDto>

    fun findByUserIdAndOpportunityId(
        userId: Long,
        opportunityId: Long,
    ): FavoriteDto?

    fun findByUserIdAndEmployerUserId(
        userId: Long,
        employerUserId: Long,
    ): FavoriteDto?

    fun deleteByUserIdAndOpportunityId(
        userId: Long,
        opportunityId: Long,
    )

    fun deleteByUserIdAndEmployerUserId(
        userId: Long,
        employerUserId: Long,
    )

    fun existsByUserIdAndOpportunityId(
        userId: Long,
        opportunityId: Long,
    ): Boolean

    fun existsByUserIdAndEmployerUserId(
        userId: Long,
        employerUserId: Long,
    ): Boolean
}
