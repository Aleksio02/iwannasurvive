package ru.itplanet.trampline.opportunity.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class OpportunityNotFoundException(id: Long) : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = "opportunity_not_found",
    message = "Возможность с идентификатором $id не найдена",
)
