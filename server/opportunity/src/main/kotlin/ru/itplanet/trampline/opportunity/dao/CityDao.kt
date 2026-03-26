package ru.itplanet.trampline.opportunity.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.opportunity.dao.dto.CityDto
import java.util.Optional

interface CityDao : JpaRepository<CityDto, Long> {

    fun findByIdAndIsActiveTrue(id: Long): Optional<CityDto>
}
