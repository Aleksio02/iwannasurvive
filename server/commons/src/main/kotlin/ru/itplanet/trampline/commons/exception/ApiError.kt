package ru.itplanet.trampline.commons.exception

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.OffsetDateTime
import java.time.ZoneOffset

data class ApiError(
    val status: Int,
    val error: String,
    val message: String,
    val details: Map<String, String> = emptyMap(),
    @JsonInclude(JsonInclude.Include.NON_NULL)
    val code: String? = null,
    val timestamp: OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC),
)
