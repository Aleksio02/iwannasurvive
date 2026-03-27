package ru.itplanet.trampline.media.config

import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.security.SecurityRequirement
import io.swagger.v3.oas.models.security.SecurityScheme
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OpenApiConfig {

    @Bean
    fun mediaOpenApi(): OpenAPI {
        return OpenAPI()
            .info(
                Info()
                    .title("Tramplin Media Internal API")
                    .version("v1")
                    .description(
                        "Internal API for file upload and storage management. " +
                                "Swagger UI includes only /internal/** endpoints."
                    )
            )
            .components(
                Components().addSecuritySchemes(
                    INTERNAL_API_KEY_SCHEME,
                    SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .`in`(SecurityScheme.In.HEADER)
                        .name("X-Internal-Api-Key")
                        .description("Internal API key for service-to-service calls.")
                )
            )
            .addSecurityItem(
                SecurityRequirement().addList(INTERNAL_API_KEY_SCHEME)
            )
    }

    companion object {
        const val INTERNAL_API_KEY_SCHEME = "internalApiKey"
    }
}
