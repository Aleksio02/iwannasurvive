package ru.itplanet.trampline.profile.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class ProfileBadRequestException(
    message: String,
    code: String = "profile_bad_request",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.BAD_REQUEST,
    code = code,
    message = message,
    details = details,
)

class ProfileForbiddenException(
    message: String,
    code: String = "profile_forbidden",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.FORBIDDEN,
    code = code,
    message = message,
    details = details,
)

class ProfileNotFoundException(
    message: String,
    code: String = "profile_resource_not_found",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = code,
    message = message,
    details = details,
)

class ProfileConflictException(
    message: String,
    code: String = "profile_conflict",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.CONFLICT,
    code = code,
    message = message,
    details = details,
)

class ProfileIntegrationException(
    message: String,
    code: String = "profile_integration_error",
    status: HttpStatus = HttpStatus.BAD_GATEWAY,
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = status,
    code = code,
    message = message,
    details = details,
)
