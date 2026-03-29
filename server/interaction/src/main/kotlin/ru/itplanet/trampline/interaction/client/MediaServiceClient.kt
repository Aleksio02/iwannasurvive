package ru.itplanet.trampline.interaction.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import ru.itplanet.trampline.commons.model.file.InternalFileMetadataResponse

@FeignClient(
    name = "interaction-media-service-client",
    url = "\${media.service.url}",
    configuration = [InternalServiceFeignConfig::class],
)
interface MediaServiceClient {

    @GetMapping("/internal/files/{fileId}")
    fun getMetadata(
        @PathVariable fileId: Long,
    ): InternalFileMetadataResponse
}
