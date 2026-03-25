package ru.itplanet.trampline.opportunity.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Size

data class CreateEmployerOpportunityContactInfoRequest(
    @field:Email
    @field:Size(max = 255)
    val email: String? = null,

    @field:Size(max = 50)
    val phone: String? = null,

    @field:Size(max = 100)
    val telegram: String? = null,

    @field:Size(max = 120)
    val contactPerson: String? = null
)
