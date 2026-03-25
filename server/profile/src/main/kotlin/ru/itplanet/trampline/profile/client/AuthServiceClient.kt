package ru.itplanet.trampline.profile.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.GetMapping
import ru.itplanet.trampline.commons.model.TokenPayload


@FeignClient(
    name = "profile-auth-service-client",
    url = "\${auth.service.url}",
    configuration = [AuthServiceFeignConfig::class]
)
interface AuthServiceClient {

    @GetMapping("/api/auth/me")
    fun validateSession(
        @CookieValue("sessionId") sessionId: String
    ): TokenPayload
}