package ru.itplanet.trampline.moderation.dao

interface PriorityCountProjection {
    fun getPriority(): ModerationTaskPriority
    fun getCount(): Long
}
