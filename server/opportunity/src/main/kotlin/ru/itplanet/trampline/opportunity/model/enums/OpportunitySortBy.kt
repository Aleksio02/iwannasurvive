package ru.itplanet.trampline.opportunity.model.enums

enum class OpportunitySortBy(val property: String) {
    PUBLISHED_AT("publishedAt"),
    TITLE("title"),
    SALARY_FROM("salaryFrom"),
    SALARY_TO("salaryTo"),
    EVENT_DATE("eventDate"),
    EXPIRES_AT("expiresAt")
}
