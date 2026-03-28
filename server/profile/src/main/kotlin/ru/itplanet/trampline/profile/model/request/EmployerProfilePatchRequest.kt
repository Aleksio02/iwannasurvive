package ru.itplanet.trampline.profile.model.request

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import jakarta.validation.Valid
import jakarta.validation.constraints.Size
import ru.itplanet.trampline.profile.model.ContactMethod
import ru.itplanet.trampline.profile.model.ProfileLink

@JsonIgnoreProperties(ignoreUnknown = true)
data class EmployerProfilePatchRequest(
    val companyName: String? = null,
    val legalName: String? = null,
    @field:Size(min = 10, max = 12)
    val inn: String? = null,
    val description: String? = null,
    val industry: String? = null,
    val websiteUrl: String? = null,
    @field:Valid
    val socialLinks: List<ProfileLink>? = null,
    @field:Valid
    val publicContacts: List<ContactMethod>? = null,
    val companySize: String? = null,
    val foundedYear: Short? = null,
    val cityId: Long? = null,
    val locationId: Long? = null,
)
