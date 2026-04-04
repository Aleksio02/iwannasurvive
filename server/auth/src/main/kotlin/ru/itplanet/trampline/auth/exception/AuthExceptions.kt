package ru.itplanet.trampline.auth.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class UserAlreadyExistsException(
    message: String = "Пользователь с такой электронной почтой уже существует",
) : ApiException(
    status = HttpStatus.CONFLICT,
    code = "user_already_exists",
    message = message,
)

class InvalidCredentialsException(
    message: String = "Неверная электронная почта или пароль",
) : ApiException(
    status = HttpStatus.UNAUTHORIZED,
    code = "invalid_credentials",
    message = message,
)

class InvalidSessionException(
    message: String = "Сессия недействительна или истекла",
) : ApiException(
    status = HttpStatus.UNAUTHORIZED,
    code = "invalid_session",
    message = message,
)

class RegistrationRoleNotAllowedException(
    message: String = "Самостоятельная регистрация доступна только для соискателя или работодателя",
) : ApiException(
    status = HttpStatus.BAD_REQUEST,
    code = "registration_role_not_allowed",
    message = message,
)

class UserNotFoundException(
    message: String = "Пользователь не найден",
) : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = "user_not_found",
    message = message,
)

class UserStatusChangeNotAllowedException(
    message: String = "Изменение статуса пользователя недоступно",
) : ApiException(
    status = HttpStatus.FORBIDDEN,
    code = "status_change_not_allowed",
    message = message,
)

class UserStatusTransitionNotAllowedException(
    message: String = "Переход в указанный статус недопустим",
) : ApiException(
    status = HttpStatus.BAD_REQUEST,
    code = "status_transition_not_allowed",
    message = message,
)
