package ru.itplanet.trampline.profile.service

import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.profile.model.request.EmployerVerificationRequest
import ru.itplanet.trampline.profile.model.response.EmployerVerificationResponse

interface EmployerVerificationService {
    fun createVerificationRequest(
        employerUserId: Long,
        request: EmployerVerificationRequest,
    ): EmployerVerificationResponse

    fun addAttachment(
        employerUserId: Long,
        verificationId: Long,
        file: MultipartFile,
    ): List<InternalFileAttachmentResponse>
}
