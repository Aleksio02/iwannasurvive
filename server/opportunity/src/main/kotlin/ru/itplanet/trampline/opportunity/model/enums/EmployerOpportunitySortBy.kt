package ru.itplanet.trampline.opportunity.model.enums

enum class EmployerOpportunitySortBy(val property: String) {
    UPDATED_AT("updatedAt"),
    CREATED_AT("createdAt"),
    TITLE("title"),
    PUBLISHED_AT("publishedAt"),
    EXPIRES_AT("expiresAt"),
    EVENT_DATE("eventDate")
}
