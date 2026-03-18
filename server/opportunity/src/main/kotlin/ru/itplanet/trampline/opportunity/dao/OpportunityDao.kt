package ru.itplanet.trampline.opportunity.dao

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto

interface OpportunityDao :
    JpaRepository<OpportunityDto, Long>,
    JpaSpecificationExecutor<OpportunityDto>
