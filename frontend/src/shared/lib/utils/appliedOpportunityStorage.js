import { getSessionUser } from '@/shared/lib/utils/sessionStore'

function getStorageKey(user = getSessionUser()) {
    if (!user?.id) return 'applied_opportunities'
    return `applied_opportunities_user_${user.id}`
}

function normalizeIds(ids) {
    return Array.from(
        new Set(
            (Array.isArray(ids) ? ids : [])
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id) && id > 0)
        )
    )
}

export function getLocalAppliedOpportunityIds(user = getSessionUser()) {
    try {
        const raw = localStorage.getItem(getStorageKey(user))
        if (!raw) return []

        const parsed = JSON.parse(raw)
        return normalizeIds(parsed)
    } catch {
        return []
    }
}

export function setLocalAppliedOpportunityIds(ids, user = getSessionUser()) {
    try {
        localStorage.setItem(getStorageKey(user), JSON.stringify(normalizeIds(ids)))
    } catch {
        // Local cache is a UX hint only; backend remains the source of truth.
    }
}

export function addLocalAppliedOpportunityId(opportunityId, user = getSessionUser()) {
    const normalizedId = Number(opportunityId)
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return

    const nextIds = getLocalAppliedOpportunityIds(user)
    nextIds.push(normalizedId)
    setLocalAppliedOpportunityIds(nextIds, user)
}

export function isOpportunityAppliedLocally(opportunityId, user = getSessionUser()) {
    const normalizedId = Number(opportunityId)
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return false

    return getLocalAppliedOpportunityIds(user).includes(normalizedId)
}
