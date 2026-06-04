package ru.itplanet.trampline.profile.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.profile.InternalEmployerOpportunityAccessResponse
import ru.itplanet.trampline.commons.model.profile.InternalEmployerVerificationStatusBatchResponse
import ru.itplanet.trampline.commons.model.profile.InternalEmployerVerificationStatusResponse
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.exception.ProfileBadRequestException
import ru.itplanet.trampline.profile.model.enums.VerificationStatus

@Service
class EmployerOpportunityAccessServiceImpl(
    private val employerProfileDao: EmployerProfileDao,
) : EmployerOpportunityAccessService {

    @Transactional(readOnly = true)
    override fun getEmployerOpportunityAccess(
        employerUserId: Long,
    ): InternalEmployerOpportunityAccessResponse {
        val employerProfile = employerProfileDao.findById(employerUserId).orElse(null)
            ?: return InternalEmployerOpportunityAccessResponse(
                employerUserId = employerUserId,
                verificationStatus = STATUS_NOT_FOUND,
                canCreateOpportunities = false,
            )

        val verificationStatus = employerProfile.verificationStatus.name

        return InternalEmployerOpportunityAccessResponse(
            employerUserId = employerUserId,
            verificationStatus = verificationStatus,
            canCreateOpportunities = employerProfile.verificationStatus == VerificationStatus.APPROVED,
        )
    }

    @Transactional(readOnly = true)
    override fun getEmployerVerificationStatuses(
        employerUserIds: Set<Long>,
    ): InternalEmployerVerificationStatusBatchResponse {
        val normalizedIds = employerUserIds
            .filter { it > 0 }
            .toSet()

        if (normalizedIds.isEmpty()) {
            return InternalEmployerVerificationStatusBatchResponse(emptyList())
        }

        if (normalizedIds.size > MAX_BATCH_SIZE) {
            throw ProfileBadRequestException(
                message = "За один запрос можно проверить не больше 500 работодателей",
                code = "too_many_employer_ids",
            )
        }

        val profilesById = employerProfileDao.findAllById(normalizedIds)
            .associateBy { it.userId }

        val items = normalizedIds.map { employerUserId ->
            val status = profilesById[employerUserId]?.verificationStatus?.name ?: STATUS_NOT_FOUND
            InternalEmployerVerificationStatusResponse(
                employerUserId = employerUserId,
                verificationStatus = status,
                employerVerified = status == VerificationStatus.APPROVED.name,
            )
        }

        return InternalEmployerVerificationStatusBatchResponse(items)
    }

    private companion object {
        const val MAX_BATCH_SIZE = 500
        const val STATUS_NOT_FOUND = "NOT_FOUND"
    }
}
