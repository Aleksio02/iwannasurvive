package ru.itplanet.trampline.profile.controller

import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.model.profile.InternalEmployerOpportunityAccessResponse
import ru.itplanet.trampline.commons.model.profile.InternalEmployerVerificationStatusBatchRequest
import ru.itplanet.trampline.commons.model.profile.InternalEmployerVerificationStatusBatchResponse
import ru.itplanet.trampline.profile.service.EmployerOpportunityAccessService

@Validated
@RestController
@RequestMapping("/internal/employer-profiles")
class InternalEmployerOpportunityAccessController(
    private val employerOpportunityAccessService: EmployerOpportunityAccessService,
) {

    @GetMapping("/{employerUserId}/opportunity-access")
    fun getEmployerOpportunityAccess(
        @PathVariable @Positive(message = "Идентификатор работодателя должен быть положительным") employerUserId: Long,
    ): InternalEmployerOpportunityAccessResponse {
        return employerOpportunityAccessService.getEmployerOpportunityAccess(employerUserId)
    }

    @PostMapping("/verification-statuses")
    fun getEmployerVerificationStatuses(
        @RequestBody request: InternalEmployerVerificationStatusBatchRequest,
    ): InternalEmployerVerificationStatusBatchResponse {
        return employerOpportunityAccessService.getEmployerVerificationStatuses(request.employerUserIds)
    }
}
