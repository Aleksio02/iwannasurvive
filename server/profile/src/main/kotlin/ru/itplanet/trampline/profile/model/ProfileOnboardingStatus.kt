package ru.itplanet.trampline.profile.model

import ru.itplanet.trampline.commons.model.Role

data class ProfileOnboardingStatus(
    val role: Role,
    val completed: Boolean,
    val requiredPath: String,
    val missingFields: List<String>,
    val issues: List<String>,
)
