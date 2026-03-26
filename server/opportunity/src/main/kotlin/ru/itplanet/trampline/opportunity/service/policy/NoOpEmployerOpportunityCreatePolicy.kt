package ru.itplanet.trampline.opportunity.service.policy

import org.springframework.stereotype.Service

@Service
class NoOpEmployerOpportunityCreatePolicy : EmployerOpportunityCreatePolicy {

    override fun checkCreateAllowed(currentUserId: Long) {
        // Intentionally no-op for now.
        // Real employer verification gate should be plugged in later.
    }
}
