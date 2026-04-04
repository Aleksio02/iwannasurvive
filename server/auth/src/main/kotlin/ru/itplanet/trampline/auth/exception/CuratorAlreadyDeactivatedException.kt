package ru.itplanet.trampline.auth.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class CuratorAlreadyDeactivatedException(
    message: String = "Куратор уже деактивирован",
) : ApiException(
    status = HttpStatus.CONFLICT,
    code = "curator_already_deactivated",
    message = message,
)
