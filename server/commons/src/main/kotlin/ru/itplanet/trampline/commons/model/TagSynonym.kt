package ru.itplanet.trampline.commons.model

data class TagSynonym(
    val id: Long,
    val tag: Tag,
    val tagId: Long,
    val synonym: String,
    val normalizedSynonym: String
)