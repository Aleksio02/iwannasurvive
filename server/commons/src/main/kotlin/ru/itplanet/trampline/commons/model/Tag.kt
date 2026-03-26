package ru.itplanet.trampline.commons.model

import ru.itplanet.trampline.commons.model.enums.TagCategory

data class Tag(
    val id: Long,
    val name: String,
    val category: TagCategory
)
