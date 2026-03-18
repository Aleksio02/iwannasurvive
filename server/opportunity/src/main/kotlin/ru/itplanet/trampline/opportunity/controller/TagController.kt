package ru.itplanet.trampline.opportunity.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.opportunity.model.Tag
import ru.itplanet.trampline.opportunity.model.enums.TagCategory
import ru.itplanet.trampline.opportunity.service.TagService

@RestController
@RequestMapping("/api/tags")
class TagController(
    private val tagService: TagService
) {

    @GetMapping
    fun getActiveTags(
        @RequestParam(required = false) category: TagCategory?
    ): List<Tag> {
        return tagService.getActiveTags(category)
    }
}
