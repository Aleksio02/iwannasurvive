package ru.itplanet.trampline.interaction.model.request

import ru.itplanet.trampline.interaction.dao.dto.ContactRecommendationStatus

data class UpdateContactRecommendationStatusRequest(
    val status: ContactRecommendationStatus,
)
