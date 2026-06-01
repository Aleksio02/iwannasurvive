package ru.itplanet.trampline.interaction.chat.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.OffsetDateTime

@Entity
@Table(name = "chat_message_attachment")
open class ChatMessageAttachmentDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    lateinit var message: ChatMessageDto

    @Column(name = "file_id", nullable = false)
    var fileId: Long = 0

    @Column(name = "original_file_name", nullable = false, length = 255)
    var originalFileName: String = ""

    @Column(name = "media_type", nullable = false, length = 255)
    var mediaType: String = ""

    @Column(name = "size_bytes", nullable = false)
    var sizeBytes: Long = 0

    @Enumerated(EnumType.STRING)
    @Column(name = "attachment_kind", nullable = false, length = 16)
    var attachmentKind: ChatAttachmentKind = ChatAttachmentKind.FILE

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: OffsetDateTime? = null
}

enum class ChatAttachmentKind {
    IMAGE,
    FILE,
}
