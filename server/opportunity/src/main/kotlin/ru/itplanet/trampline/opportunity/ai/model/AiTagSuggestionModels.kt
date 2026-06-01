package ru.itplanet.trampline.opportunity.ai.model

data class AllowedTag(
    val id: Long,
    val name: String,
)

data class SanitizedAiTagSuggestionInput(
    val title: String,
    val shortDescription: String,
    val fullDescription: String,
    val requirements: String,
)
