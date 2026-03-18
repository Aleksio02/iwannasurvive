package ru.itplanet.trampline.opportunity.model.enums

import org.springframework.data.domain.Sort

enum class SortDirection {
    ASC,
    DESC;

    fun toSpring(): Sort.Direction = when (this) {
        ASC -> Sort.Direction.ASC
        DESC -> Sort.Direction.DESC
    }
}
