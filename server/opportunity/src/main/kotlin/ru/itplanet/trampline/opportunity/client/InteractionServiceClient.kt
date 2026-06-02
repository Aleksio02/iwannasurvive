package ru.itplanet.trampline.opportunity.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import ru.itplanet.trampline.commons.model.interaction.InternalApplicantOpportunitySignalsResponse

@FeignClient(
    name = "opportunity-interaction-service-client",
    url = "\${interaction.service.url}",
    configuration = [InternalServiceFeignConfig::class],
)
interface InteractionServiceClient {
    @GetMapping("/internal/applicants/{userId}/opportunity-signals")
    fun getApplicantOpportunitySignals(
        @PathVariable userId: Long,
    ): InternalApplicantOpportunitySignalsResponse
}
