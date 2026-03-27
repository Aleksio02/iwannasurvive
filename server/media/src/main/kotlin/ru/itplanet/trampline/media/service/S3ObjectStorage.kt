package ru.itplanet.trampline.media.service

import org.springframework.stereotype.Service
import ru.itplanet.trampline.media.config.S3StorageProperties
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.PutObjectRequest

@Service
class S3ObjectStorage(
    private val s3Client: S3Client,
    private val properties: S3StorageProperties,
) : ObjectStorage {

    override fun putObject(
        key: String,
        bytes: ByteArray,
        contentType: String,
        metadata: Map<String, String>,
    ) {
        val request = PutObjectRequest.builder()
            .bucket(properties.bucket)
            .key(normalizeKey(key))
            .contentType(contentType)
            .metadata(metadata)
            .build()

        s3Client.putObject(request, RequestBody.fromBytes(bytes))
    }

    private fun normalizeKey(key: String): String {
        return key.trimStart('/')
    }
}
