package ru.itplanet.trampline.interaction.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.interaction.InternalApplicantOpportunitySignalsResponse
import ru.itplanet.trampline.interaction.dao.FavoriteDao
import ru.itplanet.trampline.interaction.dao.OpportunityResponseDao

@Service
class InternalApplicantOpportunitySignalsService(
    private val favoriteDao: FavoriteDao,
    private val opportunityResponseDao: OpportunityResponseDao,
) {
    @Transactional(readOnly = true)
    fun getSignals(userId: Long): InternalApplicantOpportunitySignalsResponse {
        return InternalApplicantOpportunitySignalsResponse(
            favoriteOpportunityIds = favoriteDao.findByUserIdOrderByCreatedAtDescIdDesc(userId)
                .mapNotNull { it.opportunityId }
                .distinct(),
            respondedOpportunityIds = opportunityResponseDao.findByApplicantUserId(userId)
                .map { it.opportunityId }
                .distinct(),
        )
    }
}
