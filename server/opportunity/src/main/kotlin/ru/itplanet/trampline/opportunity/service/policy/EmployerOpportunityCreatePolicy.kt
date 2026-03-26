package ru.itplanet.trampline.opportunity.service.policy

interface EmployerOpportunityCreatePolicy {

    fun checkCreateAllowed(currentUserId: Long)
}
