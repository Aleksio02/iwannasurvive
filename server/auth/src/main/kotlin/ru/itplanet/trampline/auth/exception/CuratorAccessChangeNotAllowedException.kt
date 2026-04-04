package ru.itplanet.trampline.auth.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class CuratorAccessChangeNotAllowedException(
    message: String = "Изменение доступа куратора недоступно",
) : ApiException(
    status = HttpStatus.BAD_REQUEST,
    code = "curator_access_change_not_allowed",
    message = message,
)
