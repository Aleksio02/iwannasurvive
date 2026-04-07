package ru.itplanet.trampline.opportunity.dao.dto

import jakarta.persistence.*
import java.time.OffsetDateTime

@Entity
@Table(name = "tag_synonym")
class TagSynonymDto: BaseLongIdEntity() {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", nullable = false)
    var tag: TagDto? = null

    @Column(name = "synonym", nullable = false)
    var synonym: String = ""

    @Column(name = "normalized_synonym", nullable = false, updatable = false, insertable = false)
    var normalizedSynonym: String = ""

    @Column(name = "created_at")
    var createdAt: OffsetDateTime? = null
}
