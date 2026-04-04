package ru.itplanet.trampline.commons.exception

import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets

@Component
class ApiErrorResponseWriter(
    private val objectMapper: ObjectMapper,
) {

    fun write(
        response: HttpServletResponse,
        status: HttpStatus,
        message: String,
        details: Map<String, String> = emptyMap(),
        code: String? = null,
    ) {
        if (response.isCommitted) {
            return
        }

        response.status = status.value()
        response.characterEncoding = StandardCharsets.UTF_8.name()
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.writer.write(
            objectMapper.writeValueAsString(
                ApiErrorFactory.create(
                    status = status,
                    message = message,
                    details = details,
                    code = code,
                )
            )
        )
        response.writer.flush()
    }
}
