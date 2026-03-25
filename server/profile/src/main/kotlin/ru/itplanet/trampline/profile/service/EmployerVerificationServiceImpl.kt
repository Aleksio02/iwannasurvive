package ru.itplanet.trampline.profile.service

import org.springframework.context.annotation.Primary
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.profile.dao.EmployerVerificationDao
import ru.itplanet.trampline.profile.dao.dto.EmployerVerificationDto
import ru.itplanet.trampline.profile.model.enums.VerificationMethod
import ru.itplanet.trampline.profile.model.enums.VerificationStatus
import ru.itplanet.trampline.profile.model.request.EmployerVerificationRequest
import ru.itplanet.trampline.profile.model.response.EmployerVerificationResponse

@Primary
@Service
class EmployerVerificationServiceImpl(
    private val employerVerificationDao: EmployerVerificationDao
): EmployerVerificationService {
    @Transactional
    override fun createVerificationRequest(
        employerUserId: Long,
        request: EmployerVerificationRequest
    ): EmployerVerificationResponse {
        val hasPending = employerVerificationDao.existsByEmployerUserIdAndStatus(
            employerUserId,
            VerificationStatus.PENDING
        )
        if (hasPending) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "You already have a pending verification request"
            )
        }

        // Преобразуем строку в enum
        val method = try {
            VerificationMethod.valueOf(request.verificationMethod.uppercase())
        } catch (e: IllegalArgumentException) {
            // TODO: create exception for it
            throw RuntimeException("Invalid verification method")
        }

        val entity = EmployerVerificationDto(
            employerUserId = employerUserId,
            verificationMethod = method,
            corporateEmail = request.corporateEmail,
            inn = request.inn,
            professionalLinks = request.professionalLinks,
            submittedComment = request.submittedComment
        )

        val saved = employerVerificationDao.save(entity)

        return toResponse(saved)
    }

    private fun toResponse(entity: EmployerVerificationDto): EmployerVerificationResponse {
        return EmployerVerificationResponse(
            id = entity.id!!,
            employerUserId = entity.employerUserId,
            status = entity.status.name,
            verificationMethod = entity.verificationMethod?.name ?: "",
            corporateEmail = entity.corporateEmail,
            inn = entity.inn,
            professionalLinks = entity.professionalLinks,
            submittedComment = entity.submittedComment,
            submittedAt = entity.submittedAt,
            createdAt = entity.createdAt
        )
    }
}