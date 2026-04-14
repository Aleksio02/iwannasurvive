package ru.itplanet.trampline.opportunity.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.commons.model.enums.TagCategory
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.opportunity.exception.OpportunityForbiddenException
import ru.itplanet.trampline.opportunity.model.EmployerTagResponse
import ru.itplanet.trampline.opportunity.model.enums.CreatedByType
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerTagRequest
import ru.itplanet.trampline.opportunity.security.AuthenticatedUser
import ru.itplanet.trampline.opportunity.service.EmployerAndCuratorTagService

@Validated
@RestController
@RequestMapping("/api/curator/tags")
class CuratorTagController(
    private val employerAndCuratorTagService: EmployerAndCuratorTagService,
) {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @CurrentUser currentUser: AuthenticatedUser,
        @Valid @RequestBody request: CreateEmployerTagRequest,
    ): EmployerTagResponse {
        val createdByType = resolveCuratorCreatedByType(currentUser)

        return employerAndCuratorTagService.create(
            currentUserId = currentUser.userId,
            createdByType = createdByType,
            request = request,
        )
    }

    @GetMapping
    fun getTags(
        @CurrentUser currentUser: AuthenticatedUser,
        @RequestParam(required = false) status: TagModerationStatus?,
        @RequestParam(required = false) category: TagCategory?,
        @RequestParam(required = false) search: String?,
    ): List<EmployerTagResponse> {
        val createdByType = resolveCuratorCreatedByType(currentUser)
        return employerAndCuratorTagService.getCuratorTags(
            currentUserId = currentUser.userId,
            createdByType = createdByType,
            status = status,
            category = category,
            search = search,
        )
    }

    @GetMapping("/{id}")
    fun getTagById(
        @CurrentUser currentUser: AuthenticatedUser,
        @PathVariable @Positive id: Long,
    ): EmployerTagResponse {
        val createdByType = resolveCuratorCreatedByType(currentUser)
        return employerAndCuratorTagService.getCuratorTagById(
            currentUserId = currentUser.userId,
            createdByType = createdByType,
            tagId = id,
        )
    }

    @PostMapping("/{id}/approve")
    fun approveTag(
        @CurrentUser currentUser: AuthenticatedUser,
        @PathVariable @Positive id: Long,
    ): ResponseEntity<Unit> {
        val createdByType = resolveCuratorCreatedByType(currentUser)
        employerAndCuratorTagService.approveModerationTag(
            currentUserId = currentUser.userId,
            createdByType = createdByType,
            tagId = id,
        )
        return ResponseEntity.ok().build()
    }

    @PostMapping("/{id}/reject")
    fun rejectTag(
        @CurrentUser currentUser: AuthenticatedUser,
        @PathVariable @Positive id: Long,
    ): ResponseEntity<Unit> {
        val createdByType = resolveCuratorCreatedByType(currentUser)
        employerAndCuratorTagService.cancelModerationTask(
            currentUserId = currentUser.userId,
            createdByType = createdByType,
            tagId = id,
        )
        return ResponseEntity.ok().build()
    }

    @GetMapping("/{id}/moderation-task")
    fun getModerationTask(
        @CurrentUser currentUser: AuthenticatedUser,
        @PathVariable @Positive(message = "Идентификатор тега должен быть положительным") id: Long,
    ): InternalModerationTaskLookupResponse {
        val createdByType = resolveCuratorCreatedByType(currentUser)

        return employerAndCuratorTagService.getModerationTask(
            currentUserId = currentUser.userId,
            createdByType = createdByType,
            tagId = id,
        )
    }

    @PostMapping("/{id}/moderation-task/cancel")
    fun cancelModerationTask(
        @CurrentUser currentUser: AuthenticatedUser,
        @PathVariable @Positive(message = "Идентификатор тега должен быть положительным") id: Long,
    ): ResponseEntity<Unit> {
        val createdByType = resolveCuratorCreatedByType(currentUser)

        employerAndCuratorTagService.cancelModerationTask(
            currentUserId = currentUser.userId,
            createdByType = createdByType,
            tagId = id,
        )

        return ResponseEntity.noContent().build()
    }

    private fun resolveCuratorCreatedByType(
        currentUser: AuthenticatedUser,
    ): CreatedByType {
        return when (currentUser.role) {
            Role.CURATOR -> CreatedByType.CURATOR
            Role.ADMIN -> CreatedByType.ADMIN
            else -> throw OpportunityForbiddenException(
                message = "Только куратор или администратор может управлять кураторскими тегами",
                code = "curator_role_required",
            )
        }
    }
}
