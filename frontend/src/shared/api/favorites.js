import {
    getFavorites,
    addEmployerToFavorites as addEmployerToFavoritesApi,
    removeEmployerFromFavorites as removeEmployerFromFavoritesApi,
} from './interaction'
import { getPublicEmployerProfile } from './profile'
import {
    addLocalFavoriteEmployerId,
    buildFavoritesFromLocalStorage,
    getLocalFavoriteEmployerTitle,
    removeLocalFavoriteEmployerId,
    setLocalFavoriteEmployerTitle,
} from '@/shared/lib/utils/favoriteStorage'

let savedFavoritesCache = null
let savedFavoritesCacheAt = 0
let savedFavoritesInFlight = null
const SAVED_FAVORITES_CACHE_TTL_MS = 30_000

function createEmptyFavorites() {
    return {
        opportunities: [],
        employers: [],
    }
}

function setSavedFavoritesCache(nextValue) {
    savedFavoritesCache = nextValue
    savedFavoritesCacheAt = Date.now()
    savedFavoritesInFlight = null
    return savedFavoritesCache
}

export function invalidateSavedFavoritesCache() {
    savedFavoritesCache = null
    savedFavoritesCacheAt = 0
    savedFavoritesInFlight = null
}

export function getCachedSavedFavorites() {
    if (
        savedFavoritesCache &&
        Date.now() - savedFavoritesCacheAt < SAVED_FAVORITES_CACHE_TTL_MS
    ) {
        return savedFavoritesCache
    }

    return createEmptyFavorites()
}

function toNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
}

function mapOpportunityFavorite(item, index) {
    const id = toNumberOrNull(
        item.targetId ??
        item.opportunityId ??
        item.opportunity_id ??
        item.opportunity?.id ??
        item.id ??
        null
    )

    return {
        id,
        title:
            item.title ||
            item.opportunityTitle ||
            item.opportunity?.title ||
            (id ? `Возможность #${id}` : `Возможность ${index + 1}`),
        companyName:
            item.subtitle ||
            item.companyName ||
            item.opportunity?.companyName ||
            'Компания',
        logo: item.logo || null,
        savedAt: item.createdAt || item.savedAt || null,
    }
}

export function isGenericEmployerTitle(title, id) {
    if (!title || !id) return true
    const normalized = String(title).trim()
    return (
        normalized === `Работодатель #${id}` ||
        normalized === `Работодатель ${id}` ||
        normalized === `Компания #${id}` ||
        normalized === `Компания ${id}`
    )
}

function resolveEmployerFavoriteTitle(id, ...candidates) {
    const storedTitle = getLocalFavoriteEmployerTitle(id)
    if (storedTitle) return storedTitle

    for (const candidate of candidates) {
        const title = String(candidate || '').trim()
        if (title && !isGenericEmployerTitle(title, id)) {
            return title
        }
    }

    const fallback = candidates.find((candidate) => String(candidate || '').trim())
    return String(fallback || '').trim() || (id ? `Компания #${id}` : 'Компания')
}

function mapEmployerFavorite(item, index) {
    const id = toNumberOrNull(
        item.targetId ??
        item.employerUserId ??
        item.employer_user_id ??
        item.employer?.userId ??
        null
    )

    const companyName =
        item.title ||
        item.companyName ||
        item.employer?.companyName ||
        item.subtitle ||
        ''

    return {
        id,
        title: companyName || (id ? `Компания #${id}` : `Работодатель ${index + 1}`),
        subtitle:
            item.subtitle ||
            item.description ||
            item.industry ||
            item.employer?.industry ||
            '',
        logo: item.logo || null,
        savedAt: item.createdAt || item.savedAt || null,
    }
}

async function enrichEmployerFavorites(employers) {
    if (!Array.isArray(employers) || employers.length === 0) {
        return []
    }

    return Promise.all(
        employers.map(async (employer) => {
            if (!employer?.id) return employer

            const storedTitle = getLocalFavoriteEmployerTitle(employer.id)
            if (storedTitle) {
                return {
                    ...employer,
                    title: storedTitle,
                }
            }

            if (!isGenericEmployerTitle(employer.title, employer.id)) {
                return employer
            }

            try {
                const profile = await getPublicEmployerProfile(employer.id, { cacheTtlMs: 60_000 })
                const companyName = String(profile?.companyName || profile?.legalName || '').trim()
                if (!companyName) return employer

                setLocalFavoriteEmployerTitle(employer.id, companyName)

                return {
                    ...employer,
                    title: companyName,
                    subtitle: profile.industry || employer.subtitle || '',
                    logo: profile.logo || employer.logo,
                }
            } catch {
                return employer
            }
        })
    )
}

export async function getSavedFavorites() {
    if (
        savedFavoritesCache &&
        Date.now() - savedFavoritesCacheAt < SAVED_FAVORITES_CACHE_TTL_MS
    ) {
        return savedFavoritesCache
    }

    if (savedFavoritesInFlight) {
        return savedFavoritesInFlight
    }

    try {
        savedFavoritesInFlight = getFavorites().then(async (favorites) => {
            if (!Array.isArray(favorites)) {
                return setSavedFavoritesCache(createEmptyFavorites())
            }

            const fromApi = {
                opportunities: favorites
                    .filter((item) => String(item?.targetType || '').toUpperCase() === 'OPPORTUNITY')
                    .map(mapOpportunityFavorite)
                    .filter((item) => item.id !== null),
                employers: favorites
                    .filter((item) => String(item?.targetType || '').toUpperCase() === 'EMPLOYER')
                    .map(mapEmployerFavorite)
                    .filter((item) => item.id !== null),
            }
            const fromLocal = buildFavoritesFromLocalStorage()
            const mergedOpportunityIds = new Set([
                ...fromApi.opportunities.map((item) => item.id),
                ...fromLocal.opportunities.map((item) => item.id),
            ])

            const mergedEmployerIds = new Set([
                ...fromApi.employers.map((item) => item.id),
                ...fromLocal.employers.map((item) => item.id),
            ])

            const mergedEmployers = Array.from(mergedEmployerIds).map((id) => {
                const fromApiItem = fromApi.employers.find((item) => item.id === id)
                const fromLocalItem = fromLocal.employers.find((item) => item.id === id)
                const title = resolveEmployerFavoriteTitle(
                    id,
                    fromApiItem?.title,
                    fromLocalItem?.title
                )

                if (fromApiItem) {
                    return {
                        ...fromApiItem,
                        title,
                    }
                }

                if (fromLocalItem) {
                    return {
                        ...fromLocalItem,
                        title,
                    }
                }

                return {
                    id,
                    title,
                    subtitle: '',
                    logo: null,
                    savedAt: null,
                }
            })

            return setSavedFavoritesCache({
                opportunities: Array.from(mergedOpportunityIds).map((id) => {
                    const detailed = fromApi.opportunities.find((item) => item.id === id)
                    if (detailed) return detailed
                    return fromLocal.opportunities.find((item) => item.id === id) || {
                        id,
                        title: `Вакансия #${id}`,
                        companyName: 'Компания',
                        logo: null,
                        savedAt: null,
                    }
                }),
                employers: await enrichEmployerFavorites(mergedEmployers),
            })
        }).catch((error) => {
            savedFavoritesInFlight = null
            throw error
        })

        return await savedFavoritesInFlight
    } catch (error) {
        if ([401, 403, 404, 500, 502, 503].includes(error?.status) || error?.status === 0) {
            return setSavedFavoritesCache(buildFavoritesFromLocalStorage())
        }

        throw error
    }
}

function dispatchFavoritesUpdated(detail) {
    window.dispatchEvent(new CustomEvent('favorites-updated', { detail }))
}

export async function addEmployerToSaved(employerUserId, companyName = '') {
    const normalizedEmployerUserId = Number(employerUserId)
    if (!Number.isFinite(normalizedEmployerUserId) || normalizedEmployerUserId <= 0) {
        throw new Error('Не удалось определить работодателя')
    }

    const normalizedCompanyName = String(companyName || '').trim()
    let resolvedCompanyName = normalizedCompanyName

    if (!resolvedCompanyName) {
        try {
            const profile = await getPublicEmployerProfile(normalizedEmployerUserId, { cacheTtlMs: 60_000 })
            resolvedCompanyName = String(profile?.companyName || profile?.legalName || '').trim()
        } catch {
            resolvedCompanyName = ''
        }
    }

    let result = null

    try {
        result = await addEmployerToFavoritesApi(normalizedEmployerUserId)
        const apiTitle = String(result?.title || '').trim()
        if (apiTitle && !isGenericEmployerTitle(apiTitle, normalizedEmployerUserId)) {
            resolvedCompanyName = resolvedCompanyName || apiTitle
        }
    } catch (error) {
        if (![404, 0, 502, 503].includes(error?.status)) {
            throw error
        }
    }

    addLocalFavoriteEmployerId(normalizedEmployerUserId, resolvedCompanyName)

    if (resolvedCompanyName) {
        setLocalFavoriteEmployerTitle(normalizedEmployerUserId, resolvedCompanyName)
    }

    invalidateSavedFavoritesCache()

    dispatchFavoritesUpdated({
        action: 'added',
        targetType: 'EMPLOYER',
        employerUserId: normalizedEmployerUserId,
        companyName: resolvedCompanyName,
    })

    return result
}

export async function removeEmployerFromSaved(employerUserId) {
    const normalizedEmployerUserId = Number(employerUserId)
    if (!Number.isFinite(normalizedEmployerUserId) || normalizedEmployerUserId <= 0) {
        throw new Error('Не удалось определить работодателя')
    }

    let result = null

    try {
        result = await removeEmployerFromFavoritesApi(normalizedEmployerUserId)
    } catch (error) {
        if (![404, 0, 502, 503].includes(error?.status)) {
            throw error
        }
    }

    removeLocalFavoriteEmployerId(normalizedEmployerUserId)

    invalidateSavedFavoritesCache()

    dispatchFavoritesUpdated({
        action: 'removed',
        targetType: 'EMPLOYER',
        employerUserId,
    })

    return result
}
