package ru.itplanet.trampline.auth.exception

class CuratorAlreadyDeactivatedException(
    message: String = "Curator is already deactivated",
) : RuntimeException(message)
