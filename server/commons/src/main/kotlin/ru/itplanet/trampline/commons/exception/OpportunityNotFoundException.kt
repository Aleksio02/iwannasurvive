package ru.itplanet.trampline.commons.exception

import org.springframework.http.HttpStatus

class OpportunityNotFoundException(id: Long) : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = "opportunity_not_found",
    message = "Возможность с идентификатором $id не найдена",
)
