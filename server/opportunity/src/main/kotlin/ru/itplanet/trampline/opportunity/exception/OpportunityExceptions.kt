package ru.itplanet.trampline.opportunity.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class OpportunityForbiddenException(
    message: String,
    code: String = "opportunity_forbidden",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.FORBIDDEN,
    code = code,
    message = message,
    details = details,
)

class OpportunityNotFoundDomainException(
    message: String,
    code: String = "opportunity_resource_not_found",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = code,
    message = message,
    details = details,
)

class OpportunityConflictException(
    message: String,
    code: String = "opportunity_conflict",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.CONFLICT,
    code = code,
    message = message,
    details = details,
)
