package ru.itplanet.trampline.profile.service

import org.springframework.context.annotation.Primary
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole
import ru.itplanet.trampline.commons.model.file.InternalCreateFileAttachmentRequest
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.profile.client.MediaServiceClient
import ru.itplanet.trampline.profile.dao.EmployerVerificationDao
import ru.itplanet.trampline.profile.dao.dto.EmployerVerificationDto
import ru.itplanet.trampline.profile.model.enums.VerificationMethod
import ru.itplanet.trampline.profile.model.enums.VerificationStatus
import ru.itplanet.trampline.profile.model.request.EmployerVerificationRequest
import ru.itplanet.trampline.profile.model.response.EmployerVerificationResponse

@Primary
@Service
class EmployerVerificationServiceImpl(
    private val employerVerificationDao: EmployerVerificationDao,
    private val mediaServiceClient: MediaServiceClient,
) : EmployerVerificationService {

    @Transactional
    override fun createVerificationRequest(
        employerUserId: Long,
        request: EmployerVerificationRequest,
    ): EmployerVerificationResponse {
        val hasPending = employerVerificationDao.existsByEmployerUserIdAndStatus(
            employerUserId,
            VerificationStatus.PENDING,
        )
        if (hasPending) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "You already have a pending verification request",
            )
        }

        val method = when (request.verificationMethod.uppercase()) {
            "EMAIL", "CORPORATE_EMAIL" -> VerificationMethod.CORPORATE_EMAIL
            "INN", "TIN" -> VerificationMethod.TIN
            "PROFESSIONAL_LINKS", "LINKS" -> VerificationMethod.PROFESSIONAL_LINKS
            "MANUAL" -> VerificationMethod.MANUAL
            else -> throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid verification method")
        }

        val entity = EmployerVerificationDto(
            employerUserId = employerUserId,
            verificationMethod = method,
            corporateEmail = request.corporateEmail,
            inn = request.inn,
            professionalLinks = request.professionalLinks,
            submittedComment = request.submittedComment,
        )

        val saved = employerVerificationDao.save(entity)

        return toResponse(saved)
    }

    @Transactional
    override fun addAttachment(
        employerUserId: Long,
        verificationId: Long,
        file: MultipartFile,
    ): List<InternalFileAttachmentResponse> {
        val verification = employerVerificationDao.findById(verificationId)
            .orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "Verification not found")
            }

        ensureVerificationOwner(
            employerUserId = employerUserId,
            verification = verification,
        )
        ensureVerificationIsOpen(verification)

        val createdFile = mediaServiceClient.uploadFile(
            file = file,
            ownerUserId = verification.employerUserId,
            kind = FileAssetKind.VERIFICATION_ATTACHMENT,
            visibility = FileAssetVisibility.PRIVATE,
        )

        mediaServiceClient.createAttachment(
            InternalCreateFileAttachmentRequest(
                fileId = createdFile.fileId,
                entityType = FileAttachmentEntityType.EMPLOYER_VERIFICATION,
                entityId = verificationId,
                attachmentRole = FileAttachmentRole.VERIFICATION,
            ),
        )

        return loadVerificationAttachments(verificationId)
    }

    private fun ensureVerificationOwner(
        employerUserId: Long,
        verification: EmployerVerificationDto,
    ) {
        if (verification.employerUserId != employerUserId) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only verification owner can upload verification attachments",
            )
        }
    }

    private fun ensureVerificationIsOpen(
        verification: EmployerVerificationDto,
    ) {
        if (verification.status != VerificationStatus.PENDING) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "Verification is already closed",
            )
        }
    }

    private fun loadVerificationAttachments(
        verificationId: Long,
    ): List<InternalFileAttachmentResponse> {
        return mediaServiceClient.getAttachments(
            entityType = FileAttachmentEntityType.EMPLOYER_VERIFICATION,
            entityId = verificationId,
        ).filter { it.attachmentRole == FileAttachmentRole.VERIFICATION }
            .map { it.withPrivateFileVisibility() }
    }

    private fun InternalFileAttachmentResponse.withPrivateFileVisibility(): InternalFileAttachmentResponse {
        return copy(
            file = file.copy(
                visibility = FileAssetVisibility.PRIVATE,
            ),
        )
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
            createdAt = entity.createdAt,
        )
    }
}
