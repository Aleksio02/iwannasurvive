package ru.itplanet.trampline.auth.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class InvalidPasswordResetCodeException : ApiException(
    status = HttpStatus.UNAUTHORIZED,
    code = "invalid_password_reset_code",
    message = "Код сброса пароля недействителен или истёк",
)
