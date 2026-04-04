package ru.itplanet.trampline.auth.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class UserAccountDeactivatedException(
    message: String = "Учетная запись деактивирована",
) : ApiException(
    status = HttpStatus.FORBIDDEN,
    code = "user_account_deactivated",
    message = message,
)
