package ru.itplanet.trampline.opportunity.model.request

import jakarta.validation.constraints.Size

data class AiTagSuggestionRequest(
    @field:Size(max = 200, message = "Название не должно превышать 200 символов")
    val title: String? = null,

    @field:Size(max = 1000, message = "Краткое описание не должно превышать 1000 символов")
    val shortDescription: String? = null,

    val fullDescription: String? = null,

    val requirements: String? = null,
)
