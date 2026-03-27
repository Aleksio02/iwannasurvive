package ru.itplanet.trampline.media.exception

class MediaValidationException(
    override val message: String,
    val details: Map<String, String> = emptyMap(),
) : RuntimeException(message)
