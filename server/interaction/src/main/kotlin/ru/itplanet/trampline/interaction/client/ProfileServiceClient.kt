package ru.itplanet.trampline.interaction.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable

@FeignClient(
    name = "interaction-profile-service-client",
    url = "\${profile.service.url}",
    configuration = [ServiceFeignConfig::class],
)
interface ProfileServiceClient {

    @GetMapping("/api/profile/employer/{userId}")
    fun getEmployerProfile(
        @PathVariable userId: Long,
    ): EmployerProfileSummary
}
