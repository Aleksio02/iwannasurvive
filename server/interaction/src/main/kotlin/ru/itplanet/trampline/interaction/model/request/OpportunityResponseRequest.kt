package ru.itplanet.trampline.interaction.model.request

import jakarta.validation.constraints.Positive

data class OpportunityResponseRequest(
    @field:Positive(message = "Идентификатор возможности должен быть положительным")
    val opportunityId: Long,

    val applicantComment: String? = null,
    val coverLetter: String? = null,

    @field:Positive(message = "Идентификатор файла резюме должен быть положительным")
    val resumeFileId: Long? = null,
)
