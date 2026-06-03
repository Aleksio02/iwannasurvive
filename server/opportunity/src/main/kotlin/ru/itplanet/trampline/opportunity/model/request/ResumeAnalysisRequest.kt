package ru.itplanet.trampline.opportunity.model.request

import ru.itplanet.trampline.opportunity.model.ResumeAnalysisInputSource

data class ResumeAnalysisRequest(
    val resumeText: String = "",
    val source: ResumeAnalysisInputSource = ResumeAnalysisInputSource.TEXT,
)
