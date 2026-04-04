package ru.itplanet.trampline.opportunity.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class OpportunityValidationException(
    message: String,
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.BAD_REQUEST,
    code = "validation_error",
    message = message,
    details = details,
)
