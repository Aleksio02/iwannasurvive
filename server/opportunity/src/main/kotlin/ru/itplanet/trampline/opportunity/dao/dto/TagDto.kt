package ru.itplanet.trampline.opportunity.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import ru.itplanet.trampline.opportunity.model.enums.CreatedByType
import ru.itplanet.trampline.opportunity.model.enums.TagCategory

@Entity
@Table(name = "tag")
open class TagDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "name", nullable = false, length = 100)
    open var name: String = ""

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 32)
    open var category: TagCategory = TagCategory.TECH

    @Enumerated(EnumType.STRING)
    @Column(name = "created_by_type", nullable = false, length = 32)
    open var createdByType: CreatedByType = CreatedByType.SYSTEM

    @Column(name = "is_active", nullable = false)
    open var isActive: Boolean = true
}
