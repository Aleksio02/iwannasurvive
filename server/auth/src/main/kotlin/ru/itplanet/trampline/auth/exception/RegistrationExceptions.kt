package ru.itplanet.trampline.auth.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class InvalidRegistrationVerificationCodeException : ApiException(
    status = HttpStatus.UNAUTHORIZED,
    code = "invalid_registration_verification_code",
    message = "Неверный код подтверждения регистрации",
)

class InvalidRegistrationPendingTokenException : ApiException(
    status = HttpStatus.UNAUTHORIZED,
    code = "invalid_registration_pending_token",
    message = "Запрос на подтверждение регистрации недействителен или истёк",
)
