package ru.itplanet.trampline.commons.exception

import org.springframework.http.HttpStatus

object ApiErrorFactory {

    fun create(
        status: HttpStatus,
        message: String,
        details: Map<String, String> = emptyMap(),
        code: String? = null,
    ): ApiError {
        return ApiError(
            status = status.value(),
            error = status.reasonPhrase,
            message = message,
            details = details,
            code = code,
        )
    }
}
