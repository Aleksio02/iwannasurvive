package ru.itplanet.trampline.opportunity.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.opportunity.dao.dto.LocationDto
import java.util.Optional

interface LocationDao : JpaRepository<LocationDto, Long> {

    fun findByIdAndIsActiveTrue(id: Long): Optional<LocationDto>
}
