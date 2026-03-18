package ru.itplanet.trampline.opportunity.model

import ru.itplanet.trampline.opportunity.model.enums.TagCategory

data class Tag(
    val id: Long,
    val name: String,
    val category: TagCategory
)
