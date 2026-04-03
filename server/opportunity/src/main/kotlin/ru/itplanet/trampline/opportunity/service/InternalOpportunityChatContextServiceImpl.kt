package ru.itplanet.trampline.opportunity.service

import jakarta.persistence.EntityNotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.opportunity.InternalOpportunityChatContextResponse
import ru.itplanet.trampline.opportunity.dao.OpportunityDao

@Service
@Transactional(readOnly = true)
class InternalOpportunityChatContextServiceImpl(
    private val opportunityDao: OpportunityDao,
) : InternalOpportunityChatContextService {

    override fun getChatContext(opportunityId: Long): InternalOpportunityChatContextResponse {
        val opportunity = opportunityDao.findById(opportunityId)
            .orElseThrow { EntityNotFoundException("Opportunity not found") }

        val actualOpportunityId = opportunity.id
            ?: throw IllegalStateException("Opportunity id must not be null")

        val employerUserId = opportunity.employerUserId
            ?: throw IllegalStateException("Opportunity $actualOpportunityId has no employer")

        return InternalOpportunityChatContextResponse(
            opportunityId = actualOpportunityId,
            employerUserId = employerUserId,
            title = opportunity.title,
            companyName = opportunity.companyName,
            status = opportunity.status,
        )
    }
}
