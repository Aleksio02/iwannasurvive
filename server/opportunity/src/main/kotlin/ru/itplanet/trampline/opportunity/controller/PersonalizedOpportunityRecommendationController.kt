package ru.itplanet.trampline.opportunity.controller

import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.opportunity.exception.OpportunityForbiddenException
import ru.itplanet.trampline.opportunity.model.PersonalizedOpportunityRecommendationPage
import ru.itplanet.trampline.opportunity.security.AuthenticatedUser
import ru.itplanet.trampline.opportunity.service.PersonalizedOpportunityRecommendationService

@Validated
@RestController
@RequestMapping("/api/opportunities/recommendations")
class PersonalizedOpportunityRecommendationController(
    private val service: PersonalizedOpportunityRecommendationService,
) {
    @GetMapping("/personalized")
    fun getPersonalizedRecommendations(
        @CurrentUser currentUser: AuthenticatedUser,
        @RequestParam(defaultValue = "6") @Positive(message = "Лимит должен быть положительным") limit: Int,
    ): PersonalizedOpportunityRecommendationPage {
        if (currentUser.role != Role.APPLICANT) {
            throw OpportunityForbiddenException(
                message = "Персональные рекомендации доступны только соискателю",
                code = "applicant_role_required",
            )
        }
        return service.getRecommendations(currentUser.userId, limit)
    }
}
