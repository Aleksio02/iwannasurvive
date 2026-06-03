package ru.itplanet.trampline.opportunity.controller

import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.opportunity.ai.service.AiResumeAnalysisService
import ru.itplanet.trampline.opportunity.exception.OpportunityForbiddenException
import ru.itplanet.trampline.opportunity.model.request.ResumeAnalysisRequest
import ru.itplanet.trampline.opportunity.model.response.ResumeAnalysisResponse
import ru.itplanet.trampline.opportunity.security.AuthenticatedUser

@RestController
@RequestMapping("/api/opportunities/recommendations")
class ResumeAnalysisRecommendationController(
    private val service: AiResumeAnalysisService,
) {
    @PostMapping("/resume-analysis")
    fun analyzeResume(
        @CurrentUser currentUser: AuthenticatedUser,
        @RequestBody request: ResumeAnalysisRequest,
    ): ResumeAnalysisResponse {
        if (currentUser.role != Role.APPLICANT) {
            throw OpportunityForbiddenException(
                message = "Анализ резюме доступен только соискателю",
                code = "applicant_role_required",
            )
        }

        return service.analyze(currentUser.userId, request)
    }
}
