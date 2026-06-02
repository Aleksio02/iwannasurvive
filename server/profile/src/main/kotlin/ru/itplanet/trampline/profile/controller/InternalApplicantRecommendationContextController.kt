package ru.itplanet.trampline.profile.controller

import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.model.profile.InternalApplicantRecommendationContextResponse
import ru.itplanet.trampline.profile.service.InternalApplicantRecommendationContextService

@Validated
@RestController
@RequestMapping("/internal/applicant-profiles")
class InternalApplicantRecommendationContextController(
    private val service: InternalApplicantRecommendationContextService,
) {
    @GetMapping("/{userId}/recommendation-context")
    fun getRecommendationContext(
        @PathVariable @Positive(message = "Идентификатор соискателя должен быть положительным") userId: Long,
    ): InternalApplicantRecommendationContextResponse = service.getContext(userId)
}
