package ru.itplanet.trampline.opportunity.model.response

data class AiTagSuggestionResponse(
    val suggestedTags: List<AiSuggestedTagResponse>,
)

data class AiSuggestedTagResponse(
    val id: Long,
    val name: String,
    val confidence: Double,
)
