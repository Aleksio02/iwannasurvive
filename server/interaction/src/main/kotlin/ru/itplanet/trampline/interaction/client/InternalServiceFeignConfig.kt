package ru.itplanet.trampline.interaction.client

import feign.RequestInterceptor
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import ru.itplanet.trampline.interaction.config.InternalApiProperties

@Configuration
class InternalServiceFeignConfig(
    private val internalApiProperties: InternalApiProperties,
) {

    @Bean
    fun internalApiKeyRequestInterceptor(): RequestInterceptor {
        return RequestInterceptor { requestTemplate ->
            requestTemplate.header("X-Internal-Api-Key", internalApiProperties.apiKey)
        }
    }
}
