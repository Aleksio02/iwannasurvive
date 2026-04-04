package ru.itplanet.trampline.auth.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class CuratorNotFoundException(
    message: String = "Куратор не найден",
) : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = "curator_not_found",
    message = message,
)
