package ru.itplanet.trampline.media.service

import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.media.exception.MediaValidationException

@Service
class FileValidationService {

    fun validate(
        file: MultipartFile,
        kind: FileAssetKind,
    ): ValidationResult {
        if (file.isEmpty) {
            throw MediaValidationException(
                message = "Файл не должен быть пустым",
                code = "file_empty",
            )
        }

        val resolvedType = resolveContentType(file, kind)
            ?: throw MediaValidationException(
                message = "Неподдерживаемый content type для данного типа файла",
                code = "file_type_not_allowed",
                details = mapOf(
                    "kind" to kind.name,
                    "contentType" to normalizedContentType(file),
                    "originalFilename" to file.originalFilename.orEmpty(),
                    "allowedContentTypes" to allowedContentTypes(kind).joinToString(","),
                ),
            )

        val maxSizeBytes = maxSizeBytes(kind, resolvedType.fileKind)
        if (file.size > maxSizeBytes) {
            throw MediaValidationException(
                message = when {
                    kind == FileAssetKind.CHAT_ATTACHMENT && resolvedType.fileKind == ResolvedFileKind.IMAGE ->
                        "Изображение должно быть не больше 10 МБ"
                    kind == FileAssetKind.CHAT_ATTACHMENT && resolvedType.fileKind == ResolvedFileKind.PDF ->
                        "PDF должен быть не больше 20 МБ"
                    else -> "Размер файла превышает допустимый"
                },
                code = "file_size_exceeded",
                details = mapOf(
                    "maxSizeBytes" to maxSizeBytes.toString(),
                    "actualSizeBytes" to file.size.toString(),
                    "contentType" to resolvedType.mediaType,
                ),
            )
        }

        return ValidationResult(mediaType = resolvedType.mediaType)
    }

    private fun resolveContentType(file: MultipartFile, kind: FileAssetKind): ResolvedContentType? {
        val contentType = normalizedContentType(file)
        val filename = file.originalFilename?.lowercase().orEmpty()
        val allowedContentTypes = allowedContentTypes(kind)
        val hasUnknownContentType = contentType.isBlank() || contentType == "application/octet-stream"

        val resolvedType = when {
            contentType == "image/jpeg" ||
                (hasUnknownContentType && (filename.endsWith(".jpg") || filename.endsWith(".jpeg"))) ->
                ResolvedContentType("image/jpeg", ResolvedFileKind.IMAGE)

            contentType == "image/png" || (hasUnknownContentType && filename.endsWith(".png")) ->
                ResolvedContentType("image/png", ResolvedFileKind.IMAGE)

            contentType == "image/webp" || (hasUnknownContentType && filename.endsWith(".webp")) ->
                ResolvedContentType("image/webp", ResolvedFileKind.IMAGE)

            contentType == "application/pdf" || contentType == "application/x-pdf" ->
                ResolvedContentType("application/pdf", ResolvedFileKind.PDF)

            hasUnknownContentType && filename.endsWith(".pdf") ->
                ResolvedContentType("application/pdf", ResolvedFileKind.PDF)

            else -> null
        } ?: return null

        return resolvedType.takeIf { it.mediaType in allowedContentTypes }
    }

    private fun normalizedContentType(file: MultipartFile): String {
        return file.contentType
            ?.substringBefore(";")
            ?.trim()
            ?.lowercase()
            .orEmpty()
    }

    private fun allowedContentTypes(kind: FileAssetKind): Set<String> {
        return when (kind) {
            FileAssetKind.AVATAR,
            FileAssetKind.LOGO,
            FileAssetKind.OPPORTUNITY_MEDIA -> IMAGE_CONTENT_TYPES

            FileAssetKind.RESUME,
            FileAssetKind.VERIFICATION_ATTACHMENT,
            FileAssetKind.APPLICATION_ATTACHMENT -> PDF_CONTENT_TYPES

            FileAssetKind.PORTFOLIO,
            FileAssetKind.MODERATION_ATTACHMENT,
            FileAssetKind.CHAT_ATTACHMENT,
            FileAssetKind.OTHER -> IMAGE_CONTENT_TYPES + PDF_CONTENT_TYPES
        }
    }

    private fun maxSizeBytes(kind: FileAssetKind, fileKind: ResolvedFileKind): Long {
        return when (kind) {
            FileAssetKind.AVATAR,
            FileAssetKind.LOGO,
            FileAssetKind.OPPORTUNITY_MEDIA -> 10L * 1024 * 1024

            FileAssetKind.RESUME,
            FileAssetKind.VERIFICATION_ATTACHMENT,
            FileAssetKind.APPLICATION_ATTACHMENT,
            FileAssetKind.MODERATION_ATTACHMENT -> 20L * 1024 * 1024

            FileAssetKind.CHAT_ATTACHMENT -> when (fileKind) {
                ResolvedFileKind.IMAGE -> 10L * 1024 * 1024
                ResolvedFileKind.PDF -> 20L * 1024 * 1024
            }

            FileAssetKind.PORTFOLIO,
            FileAssetKind.OTHER -> 50L * 1024 * 1024
        }
    }

    data class ValidationResult(
        val mediaType: String,
    )

    private data class ResolvedContentType(
        val mediaType: String,
        val fileKind: ResolvedFileKind,
    )

    private enum class ResolvedFileKind {
        IMAGE,
        PDF,
    }

    companion object {
        private val IMAGE_CONTENT_TYPES = setOf(
            "image/jpeg",
            "image/png",
            "image/webp",
        )

        private val PDF_CONTENT_TYPES = setOf(
            "application/pdf",
        )
    }
}
