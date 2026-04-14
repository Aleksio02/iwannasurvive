package ru.itplanet.trampline.opportunity.service

import ru.itplanet.trampline.commons.model.enums.TagCategory
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.opportunity.model.EmployerTagResponse
import ru.itplanet.trampline.opportunity.model.enums.CreatedByType
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerTagRequest

interface EmployerAndCuratorTagService {

    fun create(
        currentUserId: Long,
        createdByType: CreatedByType,
        request: CreateEmployerTagRequest,
    ): EmployerTagResponse

    fun getEmployerTags(
        currentUserId: Long,
        createdByType: CreatedByType,
        status: TagModerationStatus?,
        category: TagCategory?,
        search: String?,
    ): List<EmployerTagResponse>

    fun getEmployerTagById(
        currentUserId: Long,
        createdByType: CreatedByType,
        tagId: Long,
    ): EmployerTagResponse

    fun getModerationTask(
        currentUserId: Long,
        createdByType: CreatedByType,
        tagId: Long,
    ): InternalModerationTaskLookupResponse

    fun cancelModerationTask(
        currentUserId: Long,
        createdByType: CreatedByType,
        tagId: Long,
    )
}
