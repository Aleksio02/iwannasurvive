package ru.itplanet.trampline.media.model.response

import ru.itplanet.trampline.commons.dao.dto.FileAssetDto
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileStorageProvider

data class CreatedFileResponse(
    val fileId: Long,
    val storageProvider: FileStorageProvider,
    val originalFileName: String,
    val mediaType: String,
    val sizeBytes: Long,
    val status: FileAssetStatus,
    val kind: FileAssetKind,
    val visibility: FileAssetVisibility,
) {
    companion object {
        fun from(fileAsset: FileAssetDto): CreatedFileResponse {
            return CreatedFileResponse(
                fileId = fileAsset.id!!,
                storageProvider = fileAsset.storageProvider,
                originalFileName = fileAsset.originalFileName,
                mediaType = fileAsset.mediaType,
                sizeBytes = fileAsset.sizeBytes,
                status = fileAsset.status,
                kind = fileAsset.kind,
                visibility = fileAsset.visibility,
            )
        }
    }
}
