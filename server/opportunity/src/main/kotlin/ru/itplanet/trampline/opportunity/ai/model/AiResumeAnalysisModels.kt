package ru.itplanet.trampline.opportunity.ai.model

import ru.itplanet.trampline.commons.model.enums.TagCategory

data class ResumeAnalysisCandidateTag(
    val id: Long,
    val name: String,
    val category: TagCategory,
)

data class AiResumeAnalysisParsedResult(
    val summary: String,
    val detectedSkills: List<String>,
    val suggestedSkillTags: List<AiResumeAnalysisParsedTag>,
    val suggestedInterestTags: List<AiResumeAnalysisParsedTag>,
    val strengths: List<String>,
    val improvementTips: List<String>,
)

data class AiResumeAnalysisParsedTag(
    val name: String,
    val confidence: Int,
)
