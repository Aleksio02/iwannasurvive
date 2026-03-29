package ru.itplanet.trampline.opportunity.controller

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
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.opportunity.model.EmployerTagResponse
import ru.itplanet.trampline.opportunity.model.enums.CreatedByType
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerTagRequest
import ru.itplanet.trampline.opportunity.security.AuthenticatedUser
import ru.itplanet.trampline.opportunity.service.EmployerAndCuratorTagService

@Validated
@RestController
@RequestMapping("/api/employer/tags")
class EmployerTagController(
    private val employerAndCuratorTagService: EmployerAndCuratorTagService,
) {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @CurrentUser currentUser: AuthenticatedUser,
        @Valid @RequestBody request: CreateEmployerTagRequest,
    ): EmployerTagResponse {
        ensureEmployer(currentUser)

        return employerAndCuratorTagService.create(
            currentUserId = currentUser.userId,
            createdByType = CreatedByType.EMPLOYER,
            request = request,
        )
    }

    @GetMapping("/{id}/moderation-task")
    fun getModerationTask(
        @CurrentUser currentUser: AuthenticatedUser,
        @PathVariable @Positive id: Long,
    ): InternalModerationTaskLookupResponse {
        ensureEmployer(currentUser)

        return employerAndCuratorTagService.getModerationTask(
            currentUserId = currentUser.userId,
            createdByType = CreatedByType.EMPLOYER,
            tagId = id,
        )
    }

    @PostMapping("/{id}/moderation-task/cancel")
    fun cancelModerationTask(
        @CurrentUser currentUser: AuthenticatedUser,
        @PathVariable @Positive id: Long,
    ): ResponseEntity<Unit> {
        ensureEmployer(currentUser)

        employerAndCuratorTagService.cancelModerationTask(
            currentUserId = currentUser.userId,
            createdByType = CreatedByType.EMPLOYER,
            tagId = id,
        )

        return ResponseEntity.noContent().build()
    }

    private fun ensureEmployer(
        currentUser: AuthenticatedUser,
    ) {
        if (currentUser.role != Role.EMPLOYER) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only employer can manage employer-created tags",
            )
        }
    }
}
