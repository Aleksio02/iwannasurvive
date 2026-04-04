package ru.itplanet.trampline.opportunity.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class EmployerOpportunityCreationNotAllowedException(
    message: String = "Создание возможностей недоступно",
) : ApiException(
    status = HttpStatus.FORBIDDEN,
    code = "employer_opportunity_creation_not_allowed",
    message = message,
)
