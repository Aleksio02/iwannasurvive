package ru.itplanet.trampline.opportunity.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import ru.itplanet.trampline.opportunity.model.enums.ResourceLinkType

data class CreateEmployerOpportunityResourceLinkRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val label: String,

    val linkType: ResourceLinkType,

    @field:NotBlank
    @field:Size(max = 2000)
    val url: String
)
