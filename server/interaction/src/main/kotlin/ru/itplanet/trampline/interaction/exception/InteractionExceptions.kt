package ru.itplanet.trampline.interaction.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class InteractionBadRequestException(
    message: String,
    code: String = "interaction_bad_request",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.BAD_REQUEST,
    code = code,
    message = message,
    details = details,
)

class InteractionForbiddenException(
    message: String,
    code: String = "interaction_forbidden",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.FORBIDDEN,
    code = code,
    message = message,
    details = details,
)

class InteractionNotFoundException(
    message: String,
    code: String = "interaction_resource_not_found",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = code,
    message = message,
    details = details,
)

class InteractionConflictException(
    message: String,
    code: String = "interaction_conflict",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.CONFLICT,
    code = code,
    message = message,
    details = details,
)

class InteractionIntegrationException(
    message: String,
    code: String = "interaction_integration_error",
    status: HttpStatus = HttpStatus.BAD_GATEWAY,
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = status,
    code = code,
    message = message,
    details = details,
)

class InteractionInternalException(
    message: String,
    code: String = "interaction_internal_error",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.INTERNAL_SERVER_ERROR,
    code = code,
    message = message,
    details = details,
)
