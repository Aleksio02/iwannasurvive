package ru.itplanet.trampline.media.exception

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.multipart.support.MissingServletRequestPartException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException
import ru.itplanet.trampline.commons.exception.ApiError
import java.util.NoSuchElementException

@RestControllerAdvice
class MediaExceptionHandler {

    @ExceptionHandler(MediaValidationException::class)
    fun handleMediaValidation(ex: MediaValidationException): ResponseEntity<ApiError> {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(
                ApiError(
                    status = HttpStatus.BAD_REQUEST.value(),
                    error = HttpStatus.BAD_REQUEST.reasonPhrase,
                    message = ex.message,
                    details = ex.details
                )
            )
    }

    @ExceptionHandler(
        MissingServletRequestPartException::class,
        MissingServletRequestParameterException::class,
        MaxUploadSizeExceededException::class,
    )
    fun handleMultipartErrors(ex: Exception): ResponseEntity<ApiError> {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(
                ApiError(
                    status = HttpStatus.BAD_REQUEST.value(),
                    error = HttpStatus.BAD_REQUEST.reasonPhrase,
                    message = ex.message ?: "Multipart request is invalid"
                )
            )
    }

    @ExceptionHandler(NoSuchElementException::class)
    fun handleNotFound(ex: NoSuchElementException): ResponseEntity<ApiError> {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(
                ApiError(
                    status = HttpStatus.NOT_FOUND.value(),
                    error = HttpStatus.NOT_FOUND.reasonPhrase,
                    message = ex.message ?: "Resource not found"
                )
            )
    }

    @ExceptionHandler(IllegalStateException::class)
    fun handleIllegalState(ex: IllegalStateException): ResponseEntity<ApiError> {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(
                ApiError(
                    status = HttpStatus.INTERNAL_SERVER_ERROR.value(),
                    error = HttpStatus.INTERNAL_SERVER_ERROR.reasonPhrase,
                    message = ex.message ?: "Internal server error"
                )
            )
    }
}
