package ru.itplanet.trampline.opportunity.service

import ru.itplanet.trampline.opportunity.model.Tag
import ru.itplanet.trampline.opportunity.model.enums.TagCategory

interface TagService {

    fun getActiveTags(category: TagCategory?): List<Tag>
}
