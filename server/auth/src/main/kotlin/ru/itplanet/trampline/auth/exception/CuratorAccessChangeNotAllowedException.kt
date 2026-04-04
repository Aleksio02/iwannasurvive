package ru.itplanet.trampline.auth.exception

class CuratorAccessChangeNotAllowedException(
    message: String = "Curator access change is not allowed",
) : RuntimeException(message)
