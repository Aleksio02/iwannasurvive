package ru.itplanet.trampline.interaction.client

import jakarta.validation.constraints.Positive
import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import ru.itplanet.trampline.commons.model.opportunity.InternalOpportunityChatContextResponse

@FeignClient(
    name = "interaction-internal-opportunity-service-client",
    url = "\${opportunity.service.url}",
    configuration = [InternalServiceFeignConfig::class],
)
interface InternalOpportunityServiceClient {

    @GetMapping("/internal/opportunities/{id}/chat-context")
    fun getChatContext(
        @PathVariable("id") @Positive(message = "Идентификатор возможности должен быть положительным") id: Long,
    ): InternalOpportunityChatContextResponse
}
