package ru.itplanet.trampline.auth.exception

class UserAccountDeactivatedException(
    message: String = "User account is deactivated",
) : RuntimeException(message)
