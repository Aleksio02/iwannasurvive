package ru.itplanet.trampline.interaction.model.response

import ru.itplanet.trampline.commons.model.file.InternalFileMetadataResponse
import ru.itplanet.trampline.interaction.dao.dto.FavoriteTargetType
import java.time.OffsetDateTime

data class FavoriteResponse(
    val targetType: FavoriteTargetType,
    val targetId: Long,
    val title: String,
    val subtitle: String?,
    val logo: InternalFileMetadataResponse?,
    val createdAt: OffsetDateTime?,
)
