package ru.itplanet.trampline.interaction.client

import jakarta.validation.constraints.Positive
import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import ru.itplanet.trampline.commons.model.OpportunityCard


@FeignClient(
    name = "interaction-opportunity-service-client",
    url = "\${opportunity.service.url}",
    configuration = [ServiceFeignConfig::class]
)
interface OpportunityServiceClient {

    @GetMapping("/api/opportunities/{id}")
    fun getPublicOpportunity(@PathVariable @Positive id: Long
    ): OpportunityCard
}