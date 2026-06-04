package ru.itplanet.trampline.profile.service

import ru.itplanet.trampline.commons.model.profile.InternalEmployerOpportunityAccessResponse
import ru.itplanet.trampline.commons.model.profile.InternalEmployerVerificationStatusBatchResponse

interface EmployerOpportunityAccessService {

    fun getEmployerOpportunityAccess(
        employerUserId: Long,
    ): InternalEmployerOpportunityAccessResponse

    fun getEmployerVerificationStatuses(
        employerUserIds: Set<Long>,
    ): InternalEmployerVerificationStatusBatchResponse
}
