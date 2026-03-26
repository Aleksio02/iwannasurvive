package ru.itplanet.trampline.interaction.model.response

import java.time.OffsetDateTime

data class FavoriteResponse(
    val opportunityId: Long,
    val opportunityTitle: String?,
    val createdAt: OffsetDateTime?
)