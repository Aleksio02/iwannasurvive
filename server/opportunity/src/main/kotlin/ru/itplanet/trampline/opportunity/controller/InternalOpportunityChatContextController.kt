package ru.itplanet.trampline.opportunity.controller

import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.model.opportunity.InternalOpportunityChatContextResponse
import ru.itplanet.trampline.opportunity.service.InternalOpportunityChatContextService

@Validated
@RestController
@RequestMapping("/internal/opportunities")
class InternalOpportunityChatContextController(
    private val internalOpportunityChatContextService: InternalOpportunityChatContextService,
) {

    @GetMapping("/{opportunityId}/chat-context")
    fun getChatContext(
        @PathVariable @Positive(message = "Идентификатор возможности должен быть положительным") opportunityId: Long,
    ): InternalOpportunityChatContextResponse {
        return internalOpportunityChatContextService.getChatContext(opportunityId)
    }
}
