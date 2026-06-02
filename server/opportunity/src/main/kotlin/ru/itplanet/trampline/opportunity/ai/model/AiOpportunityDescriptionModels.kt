package ru.itplanet.trampline.opportunity.ai.model

data class SanitizedAiOpportunityDescriptionInput(
    val title: String,
    val typeLabel: String,
    val workFormatLabel: String,
    val employmentTypeLabel: String,
    val gradeLabel: String,
    val salary: String,
    val cityName: String,
    val companyName: String,
    val requirements: String,
    val notes: String,
)
