package ru.itplanet.trampline.auth.exception

class CuratorNotFoundException(
    message: String = "Curator not found",
) : RuntimeException(message)
