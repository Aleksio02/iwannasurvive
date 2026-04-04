package ru.itplanet.trampline.opportunity.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import ru.itplanet.trampline.commons.model.enums.ResourceLinkType

data class CreateEmployerOpportunityResourceLinkRequest(
    @field:NotBlank(message = "Название ссылки обязательно")
    @field:Size(max = 100, message = "Название ссылки не должно превышать 100 символов")
    val label: String,

    val linkType: ResourceLinkType,

    @field:NotBlank(message = "URL ссылки обязателен")
    @field:Size(max = 2000, message = "URL ссылки не должен превышать 2000 символов")
    val url: String,
)
