import { getSessionUser } from '@/shared/lib/utils/sessionStore'

function getStorageKey(key, user = getSessionUser()) {
    if (!user?.id) return key
    return `${key}_user_${user.id}`
}

export function getLocalFavoriteOpportunityIds(user = getSessionUser()) {
    const storageKey = getStorageKey('favorite_opportunities', user)

    try {
        const raw = localStorage.getItem(storageKey)
        if (!raw) return []

        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []

        return parsed
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)
    } catch {
        return []
    }
}

export function getLocalFavoriteEmployerIds(user = getSessionUser()) {
    const storageKey = getStorageKey('favorite_employers', user)

    try {
        const raw = localStorage.getItem(storageKey)
        if (!raw) return []

        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []

        return parsed
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)
    } catch {
        return []
    }
}

function readLocalFavoriteEmployerTitles(user = getSessionUser()) {
    const storageKey = getStorageKey('favorite_employer_titles', user)

    try {
        const raw = localStorage.getItem(storageKey)
        if (!raw) return {}

        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {}
        }

        return parsed
    } catch {
        return {}
    }
}

export function getLocalFavoriteEmployerTitle(employerUserId, user = getSessionUser()) {
    const normalizedId = Number(employerUserId)
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return ''

    const titles = readLocalFavoriteEmployerTitles(user)
    const title = titles[String(normalizedId)]
    return typeof title === 'string' ? title.trim() : ''
}

export function setLocalFavoriteEmployerTitle(employerUserId, companyName, user = getSessionUser()) {
    const normalizedId = Number(employerUserId)
    const normalizedName = String(companyName || '').trim()
    if (!Number.isFinite(normalizedId) || normalizedId <= 0 || !normalizedName) return

    const storageKey = getStorageKey('favorite_employer_titles', user)
    const titles = readLocalFavoriteEmployerTitles(user)
    titles[String(normalizedId)] = normalizedName
    localStorage.setItem(storageKey, JSON.stringify(titles))
}

export function removeLocalFavoriteEmployerTitle(employerUserId, user = getSessionUser()) {
    const normalizedId = Number(employerUserId)
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return

    const storageKey = getStorageKey('favorite_employer_titles', user)
    const titles = readLocalFavoriteEmployerTitles(user)
    delete titles[String(normalizedId)]
    localStorage.setItem(storageKey, JSON.stringify(titles))
}

export function isOpportunityFavoriteLocally(opportunityId, user = getSessionUser()) {
    const normalizedId = Number(opportunityId)
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return false

    return getLocalFavoriteOpportunityIds(user).includes(normalizedId)
}

export function isEmployerFavoriteLocally(employerUserId, user = getSessionUser()) {
    const normalizedId = Number(employerUserId)
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return false

    return getLocalFavoriteEmployerIds(user).includes(normalizedId)
}

export function setLocalFavoriteOpportunityIds(ids, user = getSessionUser()) {
    const storageKey = getStorageKey('favorite_opportunities', user)
    const normalizedIds = Array.from(
        new Set(
            (Array.isArray(ids) ? ids : [])
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id) && id > 0)
        )
    )

    localStorage.setItem(storageKey, JSON.stringify(normalizedIds))
}

export function setLocalFavoriteEmployerIds(ids, user = getSessionUser()) {
    const storageKey = getStorageKey('favorite_employers', user)
    const normalizedIds = Array.from(
        new Set(
            (Array.isArray(ids) ? ids : [])
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id) && id > 0)
        )
    )

    localStorage.setItem(storageKey, JSON.stringify(normalizedIds))
}

export function addLocalFavoriteEmployerId(employerUserId, companyName = '', user = getSessionUser()) {
    const normalizedId = Number(employerUserId)
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return

    const next = new Set(getLocalFavoriteEmployerIds(user))
    next.add(normalizedId)
    setLocalFavoriteEmployerIds(Array.from(next), user)

    if (companyName) {
        setLocalFavoriteEmployerTitle(normalizedId, companyName, user)
    }
}

export function removeLocalFavoriteEmployerId(employerUserId, user = getSessionUser()) {
    const normalizedId = Number(employerUserId)
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return

    const next = getLocalFavoriteEmployerIds(user).filter((id) => id !== normalizedId)
    setLocalFavoriteEmployerIds(next, user)
    removeLocalFavoriteEmployerTitle(normalizedId, user)
}

export function buildFavoritesFromLocalStorage(user = getSessionUser()) {
    const opportunityIds = getLocalFavoriteOpportunityIds(user)
    const employerIds = getLocalFavoriteEmployerIds(user)

    return {
        opportunities: opportunityIds.map((id) => ({
            id,
            title: `Вакансия #${id}`,
            companyName: 'Компания',
            logo: null,
            savedAt: null,
        })),
        employers: employerIds.map((id) => ({
            id,
            title: getLocalFavoriteEmployerTitle(id, user) || `Компания #${id}`,
            subtitle: '',
            logo: null,
            savedAt: null,
        })),
    }
}
