package ru.itplanet.trampline.interaction.model.request

import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size

data class CreateContactRecommendationRequest(
    @field:Positive(message = "Идентификатор возможности должен быть положительным")
    val opportunityId: Long,

    @field:Positive(message = "Идентификатор соискателя должен быть положительным")
    val toApplicantUserId: Long,

    @field:Size(max = 2000, message = "Сообщение не должно превышать 2000 символов")
    val message: String? = null,
)
