package ru.itplanet.trampline.interaction.controller

import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.model.interaction.InternalApplicantOpportunitySignalsResponse
import ru.itplanet.trampline.interaction.service.InternalApplicantOpportunitySignalsService

@Validated
@RestController
@RequestMapping("/internal/applicants")
class InternalApplicantOpportunitySignalsController(
    private val service: InternalApplicantOpportunitySignalsService,
) {
    @GetMapping("/{userId}/opportunity-signals")
    fun getOpportunitySignals(
        @PathVariable @Positive(message = "Идентификатор соискателя должен быть положительным") userId: Long,
    ): InternalApplicantOpportunitySignalsResponse = service.getSignals(userId)
}
