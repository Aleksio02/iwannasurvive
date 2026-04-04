package ru.itplanet.trampline.auth.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class InvalidPasswordResetTokenException : ApiException(
    status = HttpStatus.UNAUTHORIZED,
    code = "invalid_password_reset_token",
    message = "Токен сброса пароля недействителен или истёк",
)
