package ru.itplanet.trampline.media.service

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.dao.FileAssetDao
import ru.itplanet.trampline.commons.dao.dto.FileAssetDto
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileStorageProvider
import java.security.MessageDigest
import kotlin.system.measureTimeMillis

@Service
class FileAssetService(
    private val fileAssetDao: FileAssetDao,
    private val objectStorage: ObjectStorage,
    private val fileKeyFactory: FileKeyFactory,
    private val fileValidationService: FileValidationService,
    private val transactionTemplate: TransactionTemplate,
) {

    @Transactional(readOnly = true)
    fun getMetadata(fileId: Long): FileAssetDto {
        logger.info("Loading file metadata for fileId={}", fileId)
        return findExistingNotDeletedFile(fileId)
    }

    @Transactional(readOnly = true)
    fun getDownloadUrl(fileId: Long): ObjectStorage.PresignedUrl {
        logger.info("Generating download url for fileId={}", fileId)

        val fileAsset = findExistingNotDeletedFile(fileId)

        if (fileAsset.status != FileAssetStatus.READY) {
            logger.warn(
                "Cannot generate download url for fileId={} because status={}",
                fileId,
                fileAsset.status,
            )
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "File must be in READY status to generate download url. Current status: ${fileAsset.status.name}"
            )
        }

        return objectStorage.generateDownloadUrl(fileAsset.storageKey)
    }

    fun upload(
        file: MultipartFile,
        ownerUserId: Long,
        kind: FileAssetKind,
        visibility: FileAssetVisibility = FileAssetVisibility.PRIVATE,
    ): FileAssetDto {
        val requestStartedAt = System.currentTimeMillis()

        logger.info(
            "Starting file upload: ownerUserId={}, kind={}, visibility={}, originalFileName={}, contentType={}, sizeBytes={}",
            ownerUserId,
            kind,
            visibility,
            file.originalFilename,
            file.contentType,
            file.size,
        )

        fileValidationService.validate(file, kind)
        logger.info(
            "File validation passed: ownerUserId={}, kind={}, originalFileName={}",
            ownerUserId,
            kind,
            file.originalFilename,
        )

        val originalFileName = file.originalFilename?.takeIf { it.isNotBlank() } ?: "file.bin"
        val mediaType = file.contentType?.takeIf { it.isNotBlank() } ?: MediaType.APPLICATION_OCTET_STREAM_VALUE

        val readBytesDurationMs: Long
        val bytes: ByteArray
        run {
            var localBytes = ByteArray(0)
            readBytesDurationMs = measureTimeMillis {
                localBytes = file.bytes
            }
            bytes = localBytes
        }

        logger.info(
            "Multipart bytes loaded into memory: ownerUserId={}, kind={}, originalFileName={}, sizeBytes={}, durationMs={}",
            ownerUserId,
            kind,
            originalFileName,
            bytes.size,
            readBytesDurationMs,
        )

        val checksumCalculationDurationMs: Long
        val checksumSha256: String
        run {
            var localChecksum = ""
            checksumCalculationDurationMs = measureTimeMillis {
                localChecksum = sha256Hex(bytes)
            }
            checksumSha256 = localChecksum
        }

        logger.info(
            "Checksum calculated: ownerUserId={}, kind={}, originalFileName={}, checksumSha256={}, durationMs={}",
            ownerUserId,
            kind,
            originalFileName,
            checksumSha256,
            checksumCalculationDurationMs,
        )

        val storageKey = fileKeyFactory.buildKey(
            kind = kind,
            ownerUserId = ownerUserId,
            originalFileName = originalFileName,
        )

        logger.info(
            "Generated storage key for upload: ownerUserId={}, kind={}, originalFileName={}, storageKey={}",
            ownerUserId,
            kind,
            originalFileName,
            storageKey,
        )

        val createDbRecordDurationMs: Long
        val createdFileAsset: FileAssetDto
        run {
            var localCreatedFileAsset: FileAssetDto? = null
            createDbRecordDurationMs = measureTimeMillis {
                localCreatedFileAsset = transactionTemplate.execute {
                    fileAssetDao.save(
                        FileAssetDto().apply {
                            this.ownerUserId = ownerUserId
                            this.storageProvider = FileStorageProvider.S3
                            this.storageKey = storageKey
                            this.originalFileName = originalFileName
                            this.mediaType = mediaType
                            this.sizeBytes = bytes.size.toLong()
                            this.checksumSha256 = checksumSha256
                            this.kind = kind
                            this.visibility = visibility
                            this.status = FileAssetStatus.UPLOADING
                        }
                    )
                }
            }
            createdFileAsset = localCreatedFileAsset
                ?: throw IllegalStateException("Failed to create file asset record")
        }

        logger.info(
            "Created file asset record: fileId={}, ownerUserId={}, kind={}, status={}, durationMs={}",
            createdFileAsset.id,
            createdFileAsset.ownerUserId,
            createdFileAsset.kind,
            createdFileAsset.status,
            createDbRecordDurationMs,
        )

        return try {
            val putObjectDurationMs = measureTimeMillis {
                logger.info(
                    "Uploading file to object storage: fileId={}, storageKey={}, sizeBytes={}, mediaType={}",
                    createdFileAsset.id,
                    createdFileAsset.storageKey,
                    bytes.size,
                    createdFileAsset.mediaType,
                )

                objectStorage.putObject(
                    key = createdFileAsset.storageKey,
                    bytes = bytes,
                    contentType = createdFileAsset.mediaType,
                    metadata = buildMetadata(createdFileAsset),
                )
            }

            logger.info(
                "Object storage upload completed: fileId={}, storageKey={}, durationMs={}",
                createdFileAsset.id,
                createdFileAsset.storageKey,
                putObjectDurationMs,
            )

            val updateReadyDurationMs: Long
            val readyFileAsset: FileAssetDto
            run {
                var localReadyFileAsset: FileAssetDto? = null
                updateReadyDurationMs = measureTimeMillis {
                    localReadyFileAsset = transactionTemplate.execute {
                        logger.info(
                            "Updating file status to READY: fileId={}, currentStatus={}",
                            createdFileAsset.id,
                            FileAssetStatus.UPLOADING,
                        )

                        val fileAsset = fileAssetDao.findById(createdFileAsset.id!!)
                            .orElseThrow { NoSuchElementException("File asset ${createdFileAsset.id} not found") }

                        fileAsset.status = FileAssetStatus.READY
                        fileAssetDao.save(fileAsset)
                    }
                }
                readyFileAsset = localReadyFileAsset
                    ?: throw IllegalStateException("Failed to update file asset status to READY")
            }

            logger.info(
                "File status updated to READY: fileId={}, updatedAt={}, durationMs={}, totalDurationMs={}",
                readyFileAsset.id,
                readyFileAsset.updatedAt,
                updateReadyDurationMs,
                System.currentTimeMillis() - requestStartedAt,
            )

            readyFileAsset
        } catch (ex: Exception) {
            logger.error(
                "File upload failed: fileId={}, ownerUserId={}, kind={}, storageKey={}, error={}",
                createdFileAsset.id,
                ownerUserId,
                kind,
                createdFileAsset.storageKey,
                ex.message,
                ex,
            )

            val markFailedDurationMs = measureTimeMillis {
                transactionTemplate.executeWithoutResult {
                    val fileAsset = fileAssetDao.findById(createdFileAsset.id!!).orElse(null)
                    if (fileAsset != null) {
                        logger.info(
                            "Marking file as FAILED: fileId={}, previousStatus={}",
                            fileAsset.id,
                            fileAsset.status,
                        )
                        fileAsset.status = FileAssetStatus.FAILED
                        fileAssetDao.save(fileAsset)
                    } else {
                        logger.warn(
                            "Cannot mark file as FAILED because file asset record was not found: fileId={}",
                            createdFileAsset.id,
                        )
                    }
                }
            }

            logger.info(
                "FAILED status handling completed: fileId={}, durationMs={}, totalDurationMs={}",
                createdFileAsset.id,
                markFailedDurationMs,
                System.currentTimeMillis() - requestStartedAt,
            )

            throw IllegalStateException("Failed to upload file to object storage", ex)
        }
    }

    private fun findExistingNotDeletedFile(fileId: Long): FileAssetDto {
        val fileAsset = fileAssetDao.findById(fileId)
            .orElseThrow {
                logger.warn("File not found by id={}", fileId)
                fileNotFound()
            }

        if (fileAsset.status == FileAssetStatus.DELETED) {
            logger.warn("File is marked as DELETED: fileId={}", fileId)
            throw fileNotFound()
        }

        return fileAsset
    }

    private fun buildMetadata(fileAsset: FileAssetDto): Map<String, String> = buildMap {
        fileAsset.id?.let { put("file-id", it.toString()) }
        fileAsset.ownerUserId?.let { put("owner-user-id", it.toString()) }
        put("kind", fileAsset.kind.name)
        put("visibility", fileAsset.visibility.name)
    }

    private fun sha256Hex(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.joinToString(separator = "") { byte ->
            "%02x".format(byte)
        }
    }

    private fun fileNotFound(): ResponseStatusException {
        return ResponseStatusException(HttpStatus.NOT_FOUND, "File not found")
    }

    private companion object {
        private val logger = LoggerFactory.getLogger(FileAssetService::class.java)
    }
}
