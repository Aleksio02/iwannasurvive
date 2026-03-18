package ru.itplanet.trampline.opportunity.exception

class OpportunityNotFoundException(id: Long) :
    RuntimeException("Public opportunity with id=$id was not found")
