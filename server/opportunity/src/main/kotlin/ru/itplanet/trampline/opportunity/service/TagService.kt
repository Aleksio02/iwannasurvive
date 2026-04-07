package ru.itplanet.trampline.opportunity.service

import ru.itplanet.trampline.commons.model.Tag
import ru.itplanet.trampline.commons.model.enums.TagCategory

interface TagService {

    fun getActiveTags(category: TagCategory?): List<Tag>

    fun getActiveTagsByIds(ids: Collection<Long>): List<Tag>

    fun getPopularTags(limit: Int = 10): List<Tag>
}
