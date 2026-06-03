package ru.itplanet.trampline.opportunity.model.response

import ru.itplanet.trampline.commons.model.enums.TagCategory
import ru.itplanet.trampline.opportunity.model.OpportunityListItem
import ru.itplanet.trampline.opportunity.model.ResumeAnalysisInputSource

data class ResumeAnalysisResponse(
    val summary: String,
    val detectedSkills: List<String>,
    val suggestedSkillTags: List<ResumeAnalysisTagSuggestion>,
    val suggestedInterestTags: List<ResumeAnalysisTagSuggestion>,
    val strengths: List<String>,
    val improvementTips: List<String>,
    val opportunityPreview: List<OpportunityListItem>,
    val source: ResumeAnalysisSource,
    val inputSource: ResumeAnalysisInputSource,
)

data class ResumeAnalysisTagSuggestion(
    val id: Long,
    val name: String,
    val category: TagCategory,
    val confidence: Int,
)

enum class ResumeAnalysisSource {
    AI,
    RULES,
}
