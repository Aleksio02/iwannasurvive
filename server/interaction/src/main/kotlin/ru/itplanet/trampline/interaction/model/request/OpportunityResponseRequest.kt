package ru.itplanet.trampline.interaction.model.request

import jakarta.validation.constraints.Positive

data class OpportunityResponseRequest(
    @field:Positive
    val opportunityId: Long,
    val applicantComment: String? = null,
    val coverLetter: String? = null,
    @field:Positive
    val resumeFileId: Long? = null,
)
