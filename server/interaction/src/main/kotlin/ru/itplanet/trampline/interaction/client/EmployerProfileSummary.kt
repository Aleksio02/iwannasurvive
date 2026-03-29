package ru.itplanet.trampline.interaction.client

import ru.itplanet.trampline.commons.model.City
import ru.itplanet.trampline.commons.model.Location
import ru.itplanet.trampline.commons.model.file.InternalFileMetadataResponse

data class EmployerProfileSummary(
    val userId: Long,
    val companyName: String?,
    val legalName: String?,
    val industry: String?,
    val city: City?,
    val location: Location?,
    val logo: InternalFileMetadataResponse? = null,
)
