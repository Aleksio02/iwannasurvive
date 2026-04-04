package ru.itplanet.trampline.profile.controller

import jakarta.validation.constraints.Positive
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.profile.security.AuthenticatedUser
import ru.itplanet.trampline.profile.service.ProfileService
import java.net.URI

@Validated
@RestController
@RequestMapping("/api/profile")
class ProfileFileDownloadController(
    private val profileService: ProfileService,
) {

    @GetMapping("/applicant/{userId}/files/{fileId}")
    fun openApplicantFile(
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
        @PathVariable @Positive(message = "Идентификатор файла должен быть положительным") fileId: Long,
    ): ResponseEntity<Void> {
        val downloadUrl = profileService.getApplicantFileDownloadUrl(
            currentUserId = currentUserIdOrNull(),
            targetUserId = userId,
            fileId = fileId,
        )

        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(downloadUrl.url))
            .build()
    }

    @GetMapping("/employer/{userId}/files/{fileId}")
    fun openEmployerFile(
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
        @PathVariable @Positive(message = "Идентификатор файла должен быть положительным") fileId: Long,
    ): ResponseEntity<Void> {
        val downloadUrl = profileService.getEmployerFileDownloadUrl(
            currentUserId = currentUserIdOrNull(),
            targetUserId = userId,
            fileId = fileId,
        )

        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(downloadUrl.url))
            .build()
    }

    private fun currentUserIdOrNull(): Long? {
        return (SecurityContextHolder.getContext().authentication?.principal as? AuthenticatedUser)
            ?.userId
    }
}
