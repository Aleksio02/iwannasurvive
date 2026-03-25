package ru.itplanet.trampline.interaction.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseDto

interface OpportunityResponseDao : JpaRepository<OpportunityResponseDto, Long> {
    fun findByUserId(userId: Long): List<OpportunityResponseDto>
    fun findByOpportunityId(opportunityId: Long): List<OpportunityResponseDto>
    fun existsByUserIdAndOpportunityId(userId: Long, opportunityId: Long): Boolean
    fun findByUserIdAndOpportunityId(userId: Long, opportunityId: Long): OpportunityResponseDto?
}