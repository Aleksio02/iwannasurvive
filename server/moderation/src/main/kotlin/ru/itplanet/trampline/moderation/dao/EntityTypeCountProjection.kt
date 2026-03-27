package ru.itplanet.trampline.moderation.dao

interface EntityTypeCountProjection {
    fun getEntityType(): ModerationEntityType
    fun getCount(): Long
}
