package ru.itplanet.trampline.opportunity.util

import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort

class OffsetBasedPageRequest(
    private val limit: Int,
    private val offset: Long,
    private val sort: Sort = Sort.unsorted(),
) : Pageable {

    init {
        require(limit > 0) { "Лимит должен быть больше нуля" }
        require(offset >= 0) { "Смещение не может быть отрицательным" }
    }

    override fun getPageNumber(): Int = (offset / limit).toInt()

    override fun getPageSize(): Int = limit

    override fun getOffset(): Long = offset

    override fun getSort(): Sort = sort

    override fun next(): Pageable = OffsetBasedPageRequest(limit, offset + limit, sort)

    override fun previousOrFirst(): Pageable =
        if (hasPrevious()) OffsetBasedPageRequest(limit, offset - limit, sort) else first()

    override fun first(): Pageable = OffsetBasedPageRequest(limit, 0, sort)

    override fun withPage(pageNumber: Int): Pageable {
        require(pageNumber >= 0) { "Индекс страницы не может быть отрицательным" }
        return OffsetBasedPageRequest(limit, pageNumber.toLong() * limit, sort)
    }

    override fun hasPrevious(): Boolean = offset >= limit
}
