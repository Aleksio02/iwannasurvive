package ru.itplanet.trampline.profile.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.profile.model.request.EmployerVerificationRequest
import ru.itplanet.trampline.profile.model.response.EmployerVerificationResponse
import ru.itplanet.trampline.profile.service.EmployerVerificationService

@Validated
@RestController
@RequestMapping("/api/employer/verification")
class EmployerVerificationController(
    private val verificationService: EmployerVerificationService,
) {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createVerificationRequest(
        @CurrentUser employerUserId: Long,
        @Valid @RequestBody request: EmployerVerificationRequest,
    ): EmployerVerificationResponse {
        return verificationService.createVerificationRequest(employerUserId, request)
    }

    @GetMapping("/{verificationId}/moderation-task")
    fun getModerationTask(
        @CurrentUser employerUserId: Long,
        @PathVariable @Positive(message = "Идентификатор запроса на верификацию должен быть положительным") verificationId: Long,
    ): InternalModerationTaskLookupResponse {
        return verificationService.getModerationTask(employerUserId, verificationId)
    }

    @PostMapping("/{verificationId}/moderation-task/cancel")
    fun cancelModerationTask(
        @CurrentUser employerUserId: Long,
        @PathVariable @Positive(message = "Идентификатор запроса на верификацию должен быть положительным") verificationId: Long,
    ): ResponseEntity<Void> {
        verificationService.cancelModerationTask(employerUserId, verificationId)
        return ResponseEntity.noContent().build()
    }
}
