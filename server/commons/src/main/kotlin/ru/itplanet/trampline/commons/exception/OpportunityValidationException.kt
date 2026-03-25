package ru.itplanet.trampline.commons.exception

class OpportunityValidationException(
    override val message: String,
    val details: Map<String, String> = emptyMap()
) : RuntimeException(message)
