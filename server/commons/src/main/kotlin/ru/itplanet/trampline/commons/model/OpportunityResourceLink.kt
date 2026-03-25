package ru.itplanet.trampline.commons.model

import ru.itplanet.trampline.commons.model.enums.ResourceLinkType

data class OpportunityResourceLink(
    val sortOrder: Int,
    val label: String,
    val linkType: ResourceLinkType,
    val url: String
)
