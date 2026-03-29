package ru.itplanet.trampline.interaction.client

import feign.RequestInterceptor
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean

class InternalServiceFeignConfig {

    @Bean
    fun internalApiKeyRequestInterceptor(
        @Value("\${internal-api.api-key}") apiKey: String,
    ): RequestInterceptor {
        return RequestInterceptor { requestTemplate ->
            requestTemplate.header("X-Internal-Api-Key", apiKey)
        }
    }
}
