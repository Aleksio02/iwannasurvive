package ru.itplanet.trampline.opportunity.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.opportunity.InternalOpportunityChatContextResponse
import ru.itplanet.trampline.opportunity.dao.OpportunityDao
import ru.itplanet.trampline.opportunity.exception.OpportunityConflictException
import ru.itplanet.trampline.opportunity.exception.OpportunityNotFoundDomainException

@Service
@Transactional(readOnly = true)
class InternalOpportunityChatContextServiceImpl(
    private val opportunityDao: OpportunityDao,
) : InternalOpportunityChatContextService {

    override fun getChatContext(opportunityId: Long): InternalOpportunityChatContextResponse {
        val opportunity = opportunityDao.findById(opportunityId)
            .orElseThrow {
                OpportunityNotFoundDomainException(
                    message = "Возможность не найдена",
                    code = "opportunity_not_found",
                )
            }

        val actualOpportunityId = opportunity.id
            ?: throw IllegalStateException("Идентификатор возможности не должен быть null")

        val employerUserId = opportunity.employerUserId
            ?: throw OpportunityConflictException(
                message = "Невозможно получить чат-контекст возможности без работодателя",
                code = "opportunity_chat_context_unavailable",
            )

        return InternalOpportunityChatContextResponse(
            opportunityId = actualOpportunityId,
            employerUserId = employerUserId,
            title = opportunity.title,
            companyName = opportunity.companyName,
            status = opportunity.status,
        )
    }
}
