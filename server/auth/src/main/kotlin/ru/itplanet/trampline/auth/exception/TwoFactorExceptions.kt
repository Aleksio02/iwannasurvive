package ru.itplanet.trampline.auth.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class InvalidTwoFactorCodeException : ApiException(
    status = HttpStatus.UNAUTHORIZED,
    code = "invalid_two_factor_code",
    message = "Неверный код двухфакторной аутентификации",
)

class InvalidTwoFactorPendingTokenException : ApiException(
    status = HttpStatus.UNAUTHORIZED,
    code = "invalid_two_factor_pending_token",
    message = "Запрос на двухфакторную аутентификацию недействителен или истёк",
)

class TwoFactorAlreadyEnabledException : ApiException(
    status = HttpStatus.CONFLICT,
    code = "two_factor_already_enabled",
    message = "Двухфакторная аутентификация уже включена",
)

class TwoFactorAlreadyDisabledException : ApiException(
    status = HttpStatus.CONFLICT,
    code = "two_factor_already_disabled",
    message = "Двухфакторная аутентификация уже отключена",
)
