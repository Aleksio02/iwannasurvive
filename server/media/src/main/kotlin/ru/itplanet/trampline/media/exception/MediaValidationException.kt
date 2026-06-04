package ru.itplanet.trampline.media.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class MediaValidationException(
    message: String,
    code: String = "validation_error",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.BAD_REQUEST,
    code = code,
    message = message,
    details = details,
)
