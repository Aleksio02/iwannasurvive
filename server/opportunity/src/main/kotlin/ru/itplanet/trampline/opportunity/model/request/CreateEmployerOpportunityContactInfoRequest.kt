package ru.itplanet.trampline.opportunity.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Size

data class CreateEmployerOpportunityContactInfoRequest(
    @field:Email(message = "Укажите корректный адрес электронной почты")
    @field:Size(max = 255, message = "Электронная почта не должна превышать 255 символов")
    val email: String? = null,

    @field:Size(max = 50, message = "Телефон не должен превышать 50 символов")
    val phone: String? = null,

    @field:Size(max = 100, message = "Telegram не должен превышать 100 символов")
    val telegram: String? = null,

    @field:Size(max = 120, message = "Имя контактного лица не должно превышать 120 символов")
    val contactPerson: String? = null,
)
