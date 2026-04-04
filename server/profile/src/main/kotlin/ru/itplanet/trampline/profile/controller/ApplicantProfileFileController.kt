package ru.itplanet.trampline.profile.controller

import jakarta.validation.constraints.Positive
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.profile.exception.ProfileForbiddenException
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.security.AuthenticatedUser
import ru.itplanet.trampline.profile.service.ProfileService

@Validated
@RestController
@RequestMapping("/api/applicant/profile")
class ApplicantProfileFileController(
    private val profileService: ProfileService,
) {

    @PutMapping(
        value = ["/resume-file"],
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun putResumeFile(
        @RequestPart("file") file: MultipartFile,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ApplicantProfile {
        ensureApplicant(currentUser)
        return profileService.putApplicantResumeFile(
            userId = currentUser.userId,
            file = file,
        )
    }

    @PostMapping(
        value = ["/portfolio/files"],
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun addPortfolioFile(
        @RequestPart("file") file: MultipartFile,
        @CurrentUser currentUser: AuthenticatedUser,
    ): List<InternalFileAttachmentResponse> {
        ensureApplicant(currentUser)
        return profileService.addApplicantPortfolioFile(
            userId = currentUser.userId,
            file = file,
        )
    }

    @DeleteMapping("/files/{fileId}")
    fun deleteApplicantFile(
        @PathVariable @Positive(message = "Идентификатор файла должен быть положительным") fileId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ApplicantProfile {
        ensureApplicant(currentUser)
        return profileService.deleteApplicantFile(currentUser.userId, fileId)
    }

    private fun ensureApplicant(currentUser: AuthenticatedUser) {
        if (currentUser.role != Role.APPLICANT) {
            throw ProfileForbiddenException(
                message = "Только соискатель может изменять файлы профиля соискателя",
                code = "applicant_role_required",
            )
        }
    }
}
