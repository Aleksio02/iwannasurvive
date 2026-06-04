import { memo, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Link, useLocation } from 'wouter'
import Button from '@/shared/ui/Button'
import Navbar from '@/shared/layouts/Navbar'
import LazyYandexOpportunityMap from '@/shared/ui/Map/LazyYandexOpportunityMap'
import { useToast } from '@/shared/hooks/use-toast'
import { searchGeoCities } from '@/shared/api/geo'
import {
    listOpportunityMap,
    listOpportunities,
    listPersonalizedOpportunityRecommendations,
    listNearbyOpportunities,
    listTags,
    getOpportunity,
    OPPORTUNITY_LABELS
} from '@/shared/api/opportunities'
import {
    addToSaved,
    removeFromSaved,
    applyToOpportunity,
    getSeekerApplications,
    getProfileOnboardingCachedStatus,
    getProfileOnboardingStatus,
} from '@/shared/api/profile'
import {
    addEmployerToSaved,
    getSavedFavorites,
    isGenericEmployerTitle,
    removeEmployerFromSaved,
} from '@/shared/api/favorites'
import {
    getLocalFavoriteEmployerIds,
    isEmployerFavoriteLocally,
    setLocalFavoriteEmployerIds,
} from '@/shared/lib/utils/favoriteStorage'
import {
    getSessionUser,
    subscribeSessionChange,
} from '@/shared/lib/utils/sessionStore'
import { isOnboardingRole } from '@/shared/lib/utils/onboardingRoutes'
import { isEmployerVerified } from '@/shared/lib/utils/employerVerification'
import VerifiedCompanyBadge from '@/shared/ui/VerifiedCompanyBadge/VerifiedCompanyBadge'
import './OpportunitiesPage.scss'
import OpportunityCatalogSkeleton from './components/OpportunityCatalogSkeleton'
import OpportunityEmptyState from './components/OpportunityEmptyState'
import OpportunityFiltersPanel from './components/OpportunityFiltersPanel'
import PersonalizedRecommendationsSection from './components/PersonalizedRecommendationsSection'

import locationIcon from '@/assets/icons/location.svg'
import briefcaseIcon from '@/assets/icons/briefcase.svg'
import companyIcon from '@/assets/icons/company.svg'

const PAGE_LIMIT = 12
const MAP_SIDE_LIMIT = 8
const DEFAULT_MAP_RADIUS = 100000

function getGuestAwareSessionUser(user = getSessionUser(), status = getProfileOnboardingCachedStatus(user)) {
    if (isOnboardingRole(user?.role) && status?.completed !== true) {
        return null
    }

    return user
}

const TYPE_OPTIONS = [
    { value: '', label: 'Любой тип' },
    { value: 'VACANCY', label: 'Вакансии' },
    { value: 'INTERNSHIP', label: 'Стажировки' },
    { value: 'EVENT', label: 'Мероприятия' },
    { value: 'MENTORING', label: 'Менторские программы' },
]

const FORMAT_OPTIONS = [
    { value: '', label: 'Любой формат' },
    { value: 'OFFICE', label: 'Офис' },
    { value: 'HYBRID', label: 'Гибрид' },
    { value: 'REMOTE', label: 'Удалённо' },
    { value: 'ONLINE', label: 'Онлайн' },
]

function formatMoney(from, to, currency) {
    if (from == null && to == null) return 'По договорённости'
    const values = []
    if (from != null) values.push(`от ${Number(from).toLocaleString('ru-RU')}`)
    if (to != null) values.push(`до ${Number(to).toLocaleString('ru-RU')}`)
    return `${values.join(' ')} ${currency || ''}`.trim()
}

function getStorageKey(key, user = getSessionUser()) {
    if (!user || !user.id) return key
    return `${key}_user_${user.id}`
}

function setStorageSet(key, setValue, user = getSessionUser()) {
    const storageKey = getStorageKey(key, user)
    localStorage.setItem(storageKey, JSON.stringify(Array.from(setValue)))
}

function resolveEmployerUserId(item) {
    const rawId =
        item?.employerUserId ??
        item?.employer_user_id ??
        item?.employer?.userId ??
        item?.employer?.id ??
        null
    const numericId = Number(rawId)
    return Number.isFinite(numericId) && numericId > 0 ? numericId : null
}

function normalizeOpportunityListItem(item) {
    if (!item || typeof item !== 'object') return item

    return {
        ...item,
        employerUserId: resolveEmployerUserId(item),
    }
}

function getStorageSet(key, user = getSessionUser()) {
    const storageKey = getStorageKey(key, user)
    try {
        const raw = localStorage.getItem(storageKey)
        if (!raw) return new Set()
        return new Set(JSON.parse(raw))
    } catch {
        return new Set()
    }
}

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])

    return debouncedValue
}

function formatCitySuggestionLabel(city) {
    const cityName = String(city?.name || '').trim()
    const regionName = String(city?.regionName || '').trim()
    return regionName ? `${cityName}, ${regionName}` : cityName
}

function normalizeNearbyItem(item) {
    const salaryFrom =
        typeof item.salary === 'object' && item.salary !== null
            ? item.salary.from ?? null
            : typeof item.salary === 'number'
                ? item.salary
                : null

    const salaryTo =
        typeof item.salary === 'object' && item.salary !== null
            ? item.salary.to ?? null
            : null

    const salaryCurrency =
        typeof item.salary === 'object' && item.salary !== null
            ? item.salary.currency ?? 'RUB'
            : 'RUB'

    const latitude =
        item.point?.lat ??
        item.location?.coordinates?.lat ??
        null

    const longitude =
        item.point?.lng ??
        item.location?.coordinates?.lng ??
        null

    const addressLine =
        item.location?.addressLine ||
        item.city?.name ||
        'Адрес не указан'

    const companyName =
        item.employer?.companyName ||
        'Компания не указана'

    const shortDescription =
        item.fullDescription ||
        ''

    return {
        id: item.id,
        title: item.title,
        shortDescription,
        fullDescription: item.fullDescription || '',
        type: item.type,
        workFormat: item.workFormat,

        companyName,
        employerUserId: resolveEmployerUserId(item),
        employer: item.employer || null,

        salaryFrom,
        salaryTo,
        salaryCurrency,

        addressLine,
        cityName: item.city?.name || '',

        latitude,
        longitude,

        publishedAt: null,
        distanceMeters: item.distanceMeters ?? null,

        preview: {
            title: item.title,
            shortDescription,
            companyName,
            salaryFrom,
            salaryTo,
            salaryCurrency,
            workFormat: item.workFormat,
            tags: [],
        },
    }
}

function normalizeNearbyResponse(data) {
    const rawItems = data?.items || data?.content || []
    const items = rawItems.map(normalizeNearbyItem)

    const total =
        data?.total ??
        data?.totalElements ??
        data?.page?.totalElements ??
        items.length

    return { items, total }
}

const OpportunityCompactCard = memo(function OpportunityCompactCard({
    item,
    isOpportunityFavorite,
    isCompanyFavorite,
    onToggleOpportunityFavorite,
    onToggleCompanyFavorite,
    onShowOnMap,
}) {
    return (
        <article className="opportunities-page__compact-card">
            <div className="opportunities-page__compact-header">
                <h3>{item.title}</h3>
                <button
                    type="button"
                    className={`opportunities-page__fav-star ${isOpportunityFavorite ? 'is-favorite' : ''}`}
                    onClick={() => onToggleOpportunityFavorite(item)}
                >
                    ★
                </button>
            </div>

            <p className="opportunities-page__company">
                <img src={companyIcon} alt="" className="icon"/>
                <span>{item.companyName}</span>
                {isEmployerVerified(item) && (
                    <VerifiedCompanyBadge compact className="opportunities-page__verified-company-badge" />
                )}
                <button
                    type="button"
                    className={`opportunities-page__company-fav ${isCompanyFavorite ? 'is-favorite' : ''}`}
                    onClick={() => onToggleCompanyFavorite(item)}
                >
                    ★
                </button>
            </p>

            <div className="opportunities-page__compact-meta">
                <span className="opportunities-page__badge">
                    {OPPORTUNITY_LABELS.type[item.type] || 'Возможность'}
                </span>
                <span className="opportunities-page__badge">
                    {OPPORTUNITY_LABELS.workFormat[item.workFormat] || item.workFormat}
                </span>
            </div>

            <p className="opportunities-page__salary">
                <img src={briefcaseIcon} alt="" className="icon"/>
                <span>{formatMoney(item.salaryFrom, item.salaryTo, item.salaryCurrency)}</span>
            </p>

            <p className="opportunities-page__short-desc">{item.shortDescription}</p>

            <div className="opportunities-page__compact-actions">
                <button
                    type="button"
                    className="opportunities-page__map-btn"
                    onClick={() => onShowOnMap(item.id)}
                >
                    <img src={locationIcon} alt="" className="icon"/>
                    <span>Показать на карте</span>
                </button>

                <Link href={`/opportunities/${item.id}`}>
                    <button type="button" className="opportunities-page__detail-btn">
                        <span>Подробнее</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18L15 12L9 6"/>
                        </svg>
                    </button>
                </Link>
            </div>
        </article>
    )
})

const OpportunityListCard = memo(function OpportunityListCard({
    item,
    isApplicant,
    isApplied,
    isOpportunityFavorite,
    isCompanyFavorite,
    onToggleOpportunityFavorite,
    onToggleCompanyFavorite,
    onShowOnMap,
    onApply,
}) {
    return (
        <article className="opportunities-page__card">
            <div className="opportunities-page__card-header">
                <div className="opportunities-page__card-badges">
                    <span className="opportunities-page__badge opportunities-page__badge--type">
                        {OPPORTUNITY_LABELS.type[item.type] || item.type}
                    </span>
                    <span className="opportunities-page__badge">
                        {OPPORTUNITY_LABELS.workFormat[item.workFormat] || item.workFormat}
                    </span>
                </div>

                <button
                    type="button"
                    className={`opportunities-page__fav-star ${isOpportunityFavorite ? 'is-favorite' : ''}`}
                    onClick={() => onToggleOpportunityFavorite(item)}
                >
                    ★
                </button>
            </div>

            <h3>{item.title}</h3>

            <p className="opportunities-page__company">
                <img src={companyIcon} alt="" className="icon"/>
                <span>{item.companyName}</span>
                {isEmployerVerified(item) && (
                    <VerifiedCompanyBadge compact className="opportunities-page__verified-company-badge" />
                )}
                <button
                    type="button"
                    className={`opportunities-page__company-fav ${isCompanyFavorite ? 'is-favorite' : ''}`}
                    onClick={() => onToggleCompanyFavorite(item)}
                >
                    ★
                </button>
            </p>

            <p className="opportunities-page__salary">
                <img src={briefcaseIcon} alt="" className="icon"/>
                <span>{formatMoney(item.salaryFrom, item.salaryTo, item.salaryCurrency)}</span>
            </p>

            <p className="opportunities-page__desc">{item.shortDescription}</p>

            <div className="opportunities-page__card-footer">
                <button
                    type="button"
                    className="opportunities-page__map-link"
                    onClick={() => onShowOnMap(item.id)}
                >
                    <img src={locationIcon} alt="" className="icon"/>
                    <span>На карту</span>
                </button>

                <div className="opportunities-page__card-actions">
                    {isApplicant && (
                        <Button
                            className={isApplied ? 'button--outline' : 'button--primary'}
                            onClick={() => onApply(item)}
                            disabled={isApplied}
                        >
                            {isApplied ? 'Отклик отправлен' : 'Откликнуться'}
                        </Button>
                    )}
                    <Link href={`/opportunities/${item.id}`}>
                        <Button className="button--outline">Подробнее</Button>
                    </Link>
                </div>
            </div>
        </article>
    )
})

function OpportunitiesPage() {
    const [, navigate] = useLocation()
    const { toast } = useToast()

    const [sessionUser, setSessionUser] = useState(getSessionUser())
    const [onboardingStatus, setOnboardingStatus] = useState(() => {
        const user = getSessionUser()
        return isOnboardingRole(user?.role)
            ? getProfileOnboardingCachedStatus(user)
            : null
    })
    const currentUser = useMemo(
        () => getGuestAwareSessionUser(sessionUser, onboardingStatus),
        [onboardingStatus, sessionUser]
    )
    const [viewMode, setViewMode] = useState('map')
    const [filters, setFilters] = useState({
        search: '',
        skillsQuery: '',
        type: '',
        format: '',
    })
    const [salaryRange, setSalaryRange] = useState({ from: '', to: '' })
    const [selectedTags, setSelectedTags] = useState([])
    const [cityQuery, setCityQuery] = useState('')
    const [selectedCity, setSelectedCity] = useState(null)
    const [citySuggestions, setCitySuggestions] = useState([])
    const [isCitySuggestionsOpen, setIsCitySuggestionsOpen] = useState(false)
    const [cityActiveIndex, setCityActiveIndex] = useState(-1)
    const [page, setPage] = useState(0)

    const [total, setTotal] = useState(0)
    const [opportunities, setOpportunities] = useState([])

    const [baseMapPoints, setBaseMapPoints] = useState([])
    const [mapSearchResults, setMapSearchResults] = useState([])
    const [mapTotal, setMapTotal] = useState(0)
    const [isMapSearchActive, setIsMapSearchActive] = useState(false)

    const [isLoading, setIsLoading] = useState(false)
    const [isMapSearchLoading, setIsMapSearchLoading] = useState(false)
    const [error, setError] = useState('')
    const [focusedOpportunityId, setFocusedOpportunityId] = useState(null)
    const [tags, setTags] = useState([])
    const [personalizedRecommendations, setPersonalizedRecommendations] = useState([])
    const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false)
    const [recommendationsError, setRecommendationsError] = useState('')
    const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(false)
    const [hasRequestedRecommendations, setHasRequestedRecommendations] = useState(false)

    const [pendingMapCenter, setPendingMapCenter] = useState(null)
    const [appliedMapCenter, setAppliedMapCenter] = useState(null)
    const [isMapDirty, setIsMapDirty] = useState(false)
    const mapWrapRef = useRef(null)

    const [favoriteCompanies, setFavoriteCompanies] = useState(() =>
        getStorageSet('favorite_companies', getGuestAwareSessionUser())
    )
    const [favoriteEmployerIds, setFavoriteEmployerIds] = useState(
        () => new Set(getLocalFavoriteEmployerIds(getGuestAwareSessionUser()))
    )
    const [favoriteOpportunities, setFavoriteOpportunities] = useState(() =>
        getStorageSet('favorite_opportunities', getGuestAwareSessionUser())
    )
    const [appliedOpportunityIds, setAppliedOpportunityIds] = useState(() => new Set())

    const isApplicant = currentUser?.role === 'APPLICANT'

    const resetPersonalizedRecommendations = useCallback(() => {
        setPersonalizedRecommendations([])
        setRecommendationsError('')
        setIsRecommendationsLoading(false)
        setIsRecommendationsOpen(false)
        setHasRequestedRecommendations(false)
    }, [])

    const debouncedSearch = useDebounce(filters.search, 500)
    const debouncedSkills = useDebounce(filters.skillsQuery, 500)
    const debouncedCityQuery = useDebounce(cityQuery, 350)

    const visibleMapPoints = isMapSearchActive ? mapSearchResults : baseMapPoints
    const visibleMapSideSource = isMapSearchActive ? mapSearchResults : opportunities
    const visibleTotal = viewMode === 'map' && isMapSearchActive ? mapTotal : total
    const totalPages = Math.max(1, Math.ceil(visibleTotal / PAGE_LIMIT))
    const hasActiveFilters = Boolean(
        filters.search.trim() ||
        filters.skillsQuery.trim() ||
        filters.type ||
        filters.format ||
        selectedCity?.id ||
        cityQuery.trim() ||
        salaryRange.from ||
        salaryRange.to ||
        selectedTags.length > 0
    )

    useEffect(() => {
        const unsubscribe = subscribeSessionChange((nextUser) => {
            resetPersonalizedRecommendations()
            const nextStatus = isOnboardingRole(nextUser?.role)
                ? getProfileOnboardingCachedStatus(nextUser)
                : null
            const nextCurrentUser = getGuestAwareSessionUser(nextUser, nextStatus)

            setSessionUser(nextUser)
            setOnboardingStatus(nextStatus)
            setAppliedOpportunityIds(new Set())

            if (!nextCurrentUser?.id) {
                setFavoriteCompanies(getStorageSet('favorite_companies', null))
                setFavoriteOpportunities(getStorageSet('favorite_opportunities', null))
                setFavoriteEmployerIds(new Set())
                return
            }

            setFavoriteCompanies(getStorageSet('favorite_companies', nextCurrentUser))
            setFavoriteOpportunities(getStorageSet('favorite_opportunities', nextCurrentUser))
            setFavoriteEmployerIds(new Set(getLocalFavoriteEmployerIds(nextCurrentUser)))
        })

        return unsubscribe
    }, [resetPersonalizedRecommendations])

    useEffect(() => {
        if (!isOnboardingRole(sessionUser?.role)) {
            setOnboardingStatus(null)
            return undefined
        }

        let isCancelled = false
        const cachedStatus = getProfileOnboardingCachedStatus(sessionUser)
        setOnboardingStatus(cachedStatus)

        getProfileOnboardingStatus()
            .then((status) => {
                if (!isCancelled) {
                    setOnboardingStatus(status)
                }
            })
            .catch(() => {
                if (!isCancelled) {
                    setOnboardingStatus(cachedStatus)
                }
            })

        return () => {
            isCancelled = true
        }
    }, [sessionUser?.id, sessionUser?.role])

    useEffect(() => {
        if (!isApplicant) {
            setAppliedOpportunityIds(new Set())
            return
        }

        let mounted = true

        async function loadAppliedOpportunities() {
            try {
                const applications = await getSeekerApplications()
                if (!mounted) return

                const nextIds = new Set(
                    (Array.isArray(applications) ? applications : [])
                        .map((application) => Number(application.opportunityId))
                        .filter((id) => Number.isFinite(id) && id > 0)
                )
                setAppliedOpportunityIds(nextIds)
            } catch {
                if (mounted) setAppliedOpportunityIds(new Set())
            }
        }

        void loadAppliedOpportunities()

        return () => {
            mounted = false
        }
    }, [isApplicant, currentUser?.id])

    const syncFavoriteOpportunities = useCallback(async () => {
        if (!currentUser?.id) {
            const localFavorites = getStorageSet('favorite_opportunities', null)
            setFavoriteOpportunities(localFavorites)
            return
        }

        try {
            const saved = await getSavedFavorites()
            const next = new Set((saved.opportunities || []).map((item) => item.id))
            setFavoriteOpportunities(next)
            setStorageSet('favorite_opportunities', next, currentUser)

            const savedEmployers = saved.employers || []
            const employerIds = [
                ...getLocalFavoriteEmployerIds(currentUser),
                ...savedEmployers
                    .map((item) => Number(item.id))
                    .filter((id) => Number.isFinite(id) && id > 0),
            ]
            const nextEmployerIds = new Set(employerIds)

            setFavoriteEmployerIds(nextEmployerIds)
            setLocalFavoriteEmployerIds(Array.from(nextEmployerIds), currentUser)

            const nextCompanyNames = new Set(getStorageSet('favorite_companies', currentUser))
            savedEmployers.forEach((employer) => {
                const companyName = String(employer?.title || '').trim()
                if (!companyName || isGenericEmployerTitle(companyName, employer?.id)) return
                nextCompanyNames.add(companyName)
            })

            setFavoriteCompanies(nextCompanyNames)
            setStorageSet('favorite_companies', nextCompanyNames, currentUser)
        } catch (syncError) {
            console.error('Failed to sync favorites:', syncError)

            if ([401, 403, 500, 503].includes(syncError.status)) {
                setFavoriteOpportunities(getStorageSet('favorite_opportunities', null))
            }
        }
    }, [currentUser])

    const queryParams = useMemo(() => {
        const params = {
            limit: PAGE_LIMIT,
            offset: page * PAGE_LIMIT,
            search: `${debouncedSearch} ${debouncedSkills}`.trim(),
            type: filters.type,
            workFormat: filters.format,
            sortBy: 'PUBLISHED_AT',
            sortDirection: 'DESC',
        }

        if (salaryRange.from) params.salaryFrom = Number(salaryRange.from)
        if (salaryRange.to) params.salaryTo = Number(salaryRange.to)
        if (selectedTags.length > 0) params.tagIds = selectedTags
        if (selectedCity?.id) params.cityId = Number(selectedCity.id)

        return params
    }, [debouncedSearch, debouncedSkills, filters.type, filters.format, page, salaryRange, selectedCity, selectedTags])

    useEffect(() => {
        listTags('TECH')
            .then((data) => setTags(data || []))
            .catch((err) => {
                console.error('Error loading tags:', err)
                setTags([])
            })
    }, [])

    useEffect(() => {
        syncFavoriteOpportunities()
    }, [syncFavoriteOpportunities])

    useEffect(() => {
        let mounted = true
        const normalizedQuery = debouncedCityQuery.trim()

        if (normalizedQuery.length < 2) {
            setCitySuggestions([])
            return () => {
                mounted = false
            }
        }

        searchGeoCities(normalizedQuery, 10)
            .then((data) => {
                if (!mounted) return
                setCitySuggestions(Array.isArray(data) ? data : [])
            })
            .catch(() => {
                if (!mounted) return
                setCitySuggestions([])
            })

        return () => {
            mounted = false
        }
    }, [debouncedCityQuery])

    const loadPersonalizedRecommendations = useCallback(async () => {
        if (!isApplicant || isRecommendationsLoading || hasRequestedRecommendations) return
        setIsRecommendationsLoading(true)
        setRecommendationsError('')

        try {
            const data = await listPersonalizedOpportunityRecommendations()
            setPersonalizedRecommendations(data?.items || [])
            setHasRequestedRecommendations(true)
        } catch (requestError) {
            setPersonalizedRecommendations([])
            setRecommendationsError(requestError?.message || 'Не удалось загрузить рекомендации')
            setHasRequestedRecommendations(true)
        } finally {
            setIsRecommendationsLoading(false)
        }
    }, [hasRequestedRecommendations, isApplicant, isRecommendationsLoading])

    const togglePersonalizedRecommendations = () => {
        if (isRecommendationsOpen) {
            setIsRecommendationsOpen(false)
            return
        }

        setIsRecommendationsOpen(true)
        loadPersonalizedRecommendations()
    }

    useEffect(() => {
        const handleFavoritesUpdated = async () => {
            await syncFavoriteOpportunities()
        }

        const handleStorage = (event) => {
            const storageKey = getStorageKey('favorite_opportunities', currentUser)
            if (event.key === storageKey) {
                setFavoriteOpportunities(getStorageSet('favorite_opportunities', currentUser))
            }
        }

        window.addEventListener('favorites-updated', handleFavoritesUpdated)
        window.addEventListener('storage', handleStorage)

        return () => {
            window.removeEventListener('favorites-updated', handleFavoritesUpdated)
            window.removeEventListener('storage', handleStorage)
        }
    }, [syncFavoriteOpportunities, currentUser])

    useEffect(() => {
        let mounted = true

        async function loadBaseData() {
            setIsLoading(true)
            setError('')

            try {
                const listData = await listOpportunities(queryParams)
                if (!mounted) return

                setOpportunities((listData?.items || []).map(normalizeOpportunityListItem))
                setTotal(listData?.total || 0)
            } catch (requestError) {
                if (!mounted) return
                setError(requestError?.message || 'Не удалось загрузить вакансии')
                setOpportunities([])
                setTotal(0)
            } finally {
                if (mounted) setIsLoading(false)
            }
        }

        loadBaseData()

        return () => {
            mounted = false
        }
    }, [queryParams])

    useEffect(() => {
        let mounted = true

        const shouldLoadMapData = viewMode === 'map' && !isMapSearchActive
        if (!shouldLoadMapData) return () => {
            mounted = false
        }

        async function loadMapData() {
            try {
                const mapData = await listOpportunityMap({ ...queryParams, limit: 100, offset: 0 })
                if (!mounted) return
                setBaseMapPoints(mapData?.items || [])
            } catch {
                if (!mounted) return
                setBaseMapPoints([])
            }
        }

        loadMapData()

        return () => {
            mounted = false
        }
    }, [isMapSearchActive, queryParams, viewMode])

    const mapSideOpportunities = useMemo(() => {
        return [...visibleMapSideSource]
            .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
            .slice(0, MAP_SIDE_LIMIT)
    }, [visibleMapSideSource])

    const isCompanyFavoriteForItem = useCallback((item) => {
        const employerUserId = resolveEmployerUserId(item)
        if (employerUserId) {
            if (favoriteEmployerIds.has(employerUserId)) return true
            if (isEmployerFavoriteLocally(employerUserId, currentUser)) return true
        }

        const companyName = String(item?.companyName || '').trim()
        return companyName ? favoriteCompanies.has(companyName) : false
    }, [currentUser, favoriteCompanies, favoriteEmployerIds])

    const toggleCompanyFavorite = useCallback(async (item) => {
        const companyName = item?.companyName
        if (!companyName) return

        let normalizedEmployerUserId = resolveEmployerUserId(item)

        if (!normalizedEmployerUserId) {
            const matchedOpportunity = opportunities.find(
                (opportunity) => opportunity.companyName === companyName && resolveEmployerUserId(opportunity)
            )
            normalizedEmployerUserId = resolveEmployerUserId(matchedOpportunity)
        }

        if (!normalizedEmployerUserId && item?.id && currentUser) {
            try {
                const detail = await getOpportunity(item.id)
                normalizedEmployerUserId = resolveEmployerUserId(detail)
            } catch {
                normalizedEmployerUserId = null
            }
        }

        const hasEmployerUserId = Number.isFinite(normalizedEmployerUserId) && normalizedEmployerUserId > 0
        const isFavorite = hasEmployerUserId
            ? favoriteEmployerIds.has(normalizedEmployerUserId) || favoriteCompanies.has(companyName)
            : favoriteCompanies.has(companyName)

        if (!currentUser) {
            const next = new Set(favoriteCompanies)
            if (isFavorite) next.delete(companyName)
            else next.add(companyName)

            setFavoriteCompanies(next)
            setStorageSet('favorite_companies', next, null)

            toast({
                title: isFavorite ? 'Компания удалена из избранного' : 'Компания добавлена в избранное',
                description: isFavorite ? '' : 'Вакансии этой компании будут выделены на карте',
            })
            return
        }

        if (hasEmployerUserId) {
            try {
                if (isFavorite) {
                    await removeEmployerFromSaved(normalizedEmployerUserId)
                } else {
                    await addEmployerToSaved(normalizedEmployerUserId, companyName)
                }
            } catch (error) {
                toast({
                    title: 'Ошибка',
                    description: error.message || 'Не удалось изменить избранное работодателя',
                    variant: 'destructive',
                })
                return
            }

            const nextEmployerIds = new Set(favoriteEmployerIds)
            if (isFavorite) nextEmployerIds.delete(normalizedEmployerUserId)
            else nextEmployerIds.add(normalizedEmployerUserId)
            setFavoriteEmployerIds(nextEmployerIds)
            setLocalFavoriteEmployerIds(Array.from(nextEmployerIds), currentUser)
        }

        const next = new Set(favoriteCompanies)
        if (isFavorite) next.delete(companyName)
        else next.add(companyName)

        setFavoriteCompanies(next)
        setStorageSet('favorite_companies', next, currentUser)

        toast({
            title: isFavorite ? 'Компания удалена из избранного' : 'Компания добавлена в избранное',
            description: isFavorite ? '' : 'Вакансии этой компании будут выделены на карте',
        })
    }, [currentUser, favoriteCompanies, favoriteEmployerIds, opportunities, toast])

    const toggleOpportunityFavorite = useCallback(async (opportunity) => {
        const isFavorite = favoriteOpportunities.has(opportunity.id)

        if (!currentUser) {
            const next = new Set(favoriteOpportunities)
            if (isFavorite) next.delete(opportunity.id)
            else next.add(opportunity.id)

            setFavoriteOpportunities(next)
            setStorageSet('favorite_opportunities', next, null)

            toast({
                title: isFavorite ? 'Удалено из избранного' : 'Добавлено в избранное',
                description: `"${opportunity.title}" ${isFavorite ? 'удалено из избранного' : 'сохранено в избранное'}`,
            })
            return
        }

        try {
            if (isFavorite) {
                await removeFromSaved(opportunity.id)

                const next = new Set(favoriteOpportunities)
                next.delete(opportunity.id)
                setFavoriteOpportunities(next)
                setStorageSet('favorite_opportunities', next, currentUser)

                toast({
                    title: 'Удалено из избранного',
                    description: `"${opportunity.title}" удалено из избранного`,
                })
            } else {
                await addToSaved(opportunity)

                const next = new Set(favoriteOpportunities)
                next.add(opportunity.id)
                setFavoriteOpportunities(next)
                setStorageSet('favorite_opportunities', next, currentUser)

                toast({
                    title: 'Добавлено в избранное',
                    description: `"${opportunity.title}" сохранено в избранное`,
                })
            }
        } catch (error) {
            console.error('Favorite error:', error)

            if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
                const next = new Set(favoriteOpportunities)
                next.add(opportunity.id)
                setFavoriteOpportunities(next)
                setStorageSet('favorite_opportunities', next, currentUser)

                toast({
                    title: 'В избранном',
                    description: `"${opportunity.title}" уже в избранном`,
                })
                return
            }

            if ([401, 403, 500, 503].includes(error.status)) {
                toast({
                    title: 'Сессия недоступна',
                    description: 'Пожалуйста, войдите снова',
                    variant: 'destructive',
                })
                navigate('/login')
                return
            }

            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось изменить избранное',
                variant: 'destructive'
            })
        }
    }, [currentUser, favoriteOpportunities, navigate, toast])

    const handleShowOnMap = useCallback((id) => {
        setViewMode('map')
        setFocusedOpportunityId(null)

        if (typeof window !== 'undefined') {
            const isPhoneViewport =
                window.matchMedia('(max-width: 768px)').matches ||
                window.matchMedia('(hover: none), (pointer: coarse)').matches

            if (isPhoneViewport) {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        mapWrapRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                        })
                    }, 120)
                })
            }
        }

        setTimeout(() => {
            setFocusedOpportunityId(id)
        }, 100)
    }, [])

    const handleApply = useCallback(async (opportunity) => {
        if (appliedOpportunityIds.has(Number(opportunity.id))) return

        if (!currentUser) {
            toast({
                title: 'Требуется авторизация',
                description: 'Войдите в аккаунт, чтобы откликнуться',
                variant: 'destructive'
            })
            navigate('/login')
            return
        }

        if (!isApplicant) {
            toast({
                title: 'Доступ ограничен',
                description: 'Отклик доступен только для роли соискателя',
                variant: 'destructive'
            })
            return
        }

        try {
            await applyToOpportunity(opportunity.id)
            setAppliedOpportunityIds((prev) => {
                const next = new Set(prev)
                next.add(Number(opportunity.id))
                return next
            })
            toast({
                title: 'Отклик отправлен',
                description: `Ваш отклик на "${opportunity.title}" успешно отправлен`,
            })
        } catch (applyError) {
            console.error('Apply error:', applyError)

            if (applyError.message?.includes('already') || applyError.message?.includes('уже')) {
                setAppliedOpportunityIds((prev) => {
                    const next = new Set(prev)
                    next.add(Number(opportunity.id))
                    return next
                })
                toast({
                    title: 'Отклик уже отправлен',
                    description: 'Вы можете отслеживать его статус в личном кабинете',
                })
                return
            }

            if (applyError.status === 401) {
                toast({
                    title: 'Сессия недоступна',
                    description: 'Пожалуйста, войдите снова',
                    variant: 'destructive'
                })
                navigate('/login')
                return
            }

            if (applyError.status === 403) {
                toast({
                    title: 'Профиль ожидает модерацию',
                    description: 'Чтобы откликнуться, отправьте профиль на модерацию и дождитесь одобрения.',
                    variant: 'destructive',
                })
                return
            }

            toast({
                title: 'Ошибка',
                description: applyError.message || 'Не удалось отправить отклик',
                variant: 'destructive'
            })
        }
    }, [appliedOpportunityIds, currentUser, isApplicant, navigate, toast])

    const goToPage = useCallback((newPage) => {
        setPage(newPage)
        if (viewMode === 'list') {
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [viewMode])

    const resetMapSearchState = () => {
        setIsMapSearchActive(false)
        setMapSearchResults([])
        setMapTotal(0)
        setAppliedMapCenter(null)
        setPendingMapCenter(null)
        setIsMapDirty(false)
        setFocusedOpportunityId(null)
        setPage(0)
    }

    const resetAllFilters = useCallback(() => {
        setFilters({
            search: '',
            skillsQuery: '',
            type: '',
            format: '',
        })
        setSalaryRange({ from: '', to: '' })
        setSelectedTags([])
        setCityQuery('')
        setSelectedCity(null)
        setCitySuggestions([])
        setIsCitySuggestionsOpen(false)
        setCityActiveIndex(-1)
        resetMapSearchState()
    }, [])

    const applyMapSearch = async () => {
        if (!pendingMapCenter) return

        setIsMapSearchLoading(true)
        setError('')

        try {
            const nearbyData = await listNearbyOpportunities({
                lat: pendingMapCenter.lat,
                lng: pendingMapCenter.lng,
                pageNumber: 1,
                pageSize: PAGE_LIMIT,
                radius: DEFAULT_MAP_RADIUS,
            })

            const normalized = normalizeNearbyResponse(nearbyData)

            setIsMapSearchActive(true)
            setMapSearchResults(normalized.items)
            setMapTotal(normalized.total)
            setAppliedMapCenter(pendingMapCenter)
            setIsMapDirty(false)
            setPage(0)
        } catch (requestError) {
            setError(requestError?.message || 'Не удалось загрузить вакансии рядом с точкой')
        } finally {
            setIsMapSearchLoading(false)
        }
    }

    const resetMapSearch = () => {
        resetMapSearchState()
    }

    const clearMapSearchOnFiltersChange = () => {
        resetMapSearchState()
    }

    const handleSearchChange = (e) => {
        setPage(0)
        clearMapSearchOnFiltersChange()
        setFilters((prev) => ({ ...prev, search: e.target.value }))
    }

    const handleSkillsChange = (e) => {
        setPage(0)
        clearMapSearchOnFiltersChange()
        setFilters((prev) => ({ ...prev, skillsQuery: e.target.value }))
    }

    const handleTypeChange = (value) => {
        setPage(0)
        clearMapSearchOnFiltersChange()
        setFilters((prev) => ({ ...prev, type: value }))
    }

    const handleFormatChange = (value) => {
        setPage(0)
        clearMapSearchOnFiltersChange()
        setFilters((prev) => ({ ...prev, format: value }))
    }

    const handleCityQueryChange = (value) => {
        setPage(0)
        clearMapSearchOnFiltersChange()
        setCityQuery(value)
        if (!selectedCity) return

        const selectedLabel = formatCitySuggestionLabel(selectedCity)
        if (value !== selectedLabel) {
            setSelectedCity(null)
        }
    }

    const handleCitySelect = (city) => {
        const label = formatCitySuggestionLabel(city)
        setPage(0)
        clearMapSearchOnFiltersChange()
        setSelectedCity(city)
        setCityQuery(label)
        setIsCitySuggestionsOpen(false)
        setCityActiveIndex(-1)
    }

    const handleSalaryFromChange = (e) => {
        setPage(0)
        clearMapSearchOnFiltersChange()
        setSalaryRange((prev) => ({ ...prev, from: e.target.value }))
    }

    const handleSalaryToChange = (e) => {
        setPage(0)
        clearMapSearchOnFiltersChange()
        setSalaryRange((prev) => ({ ...prev, to: e.target.value }))
    }

    const handleTagClick = (tagId) => {
        setPage(0)
        clearMapSearchOnFiltersChange()
        setSelectedTags((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId]
        )
    }

    const handleMapCenterChange = useCallback((center) => {
        setPendingMapCenter(center)

        const hasChanged =
            !appliedMapCenter ||
            Math.abs(center.lat - appliedMapCenter.lat) > 0.0001 ||
            Math.abs(center.lng - appliedMapCenter.lng) > 0.0001

        if (hasChanged) {
            setIsMapDirty(true)
        }
    }, [appliedMapCenter])

    const handleOpenCard = useCallback((id) => {
        setFocusedOpportunityId(id)
    }, [])

    const handleOpenDetails = useCallback((id) => {
        navigate(`/opportunities/${id}`)
    }, [navigate])

    const showGlobalEmpty =
        !isLoading &&
        !error &&
        viewMode === 'list' &&
        opportunities.length === 0

    const showMapEmpty =
        !isLoading &&
        !isMapSearchLoading &&
        !error &&
        viewMode === 'map' &&
        mapSideOpportunities.length === 0

    const shouldShowMapControls =
        viewMode === 'map' && (isMapSearchActive || (isMapDirty && pendingMapCenter))

    const mapControlsContent = (
        <div className="opportunities-page__map-controls">
            <div className="opportunities-page__map-controls-inner">
                {isMapDirty && pendingMapCenter && (
                    <>
                        <div className="opportunities-page__map-controls-badge">
                            Область карты изменена
                        </div>

                        <button
                            type="button"
                            className="opportunities-page__map-controls-btn opportunities-page__map-controls-btn--primary"
                            onClick={applyMapSearch}
                            disabled={isMapSearchLoading}
                        >
                            {isMapSearchLoading ? 'Поиск...' : 'Искать в этой области'}
                        </button>
                    </>
                )}

                {isMapSearchActive && !isMapDirty && (
                    <>
                        <div className="opportunities-page__map-controls-badge">
                            На карте показаны результаты в выбранной области
                        </div>

                        <button
                            type="button"
                            className="opportunities-page__map-controls-btn opportunities-page__map-controls-btn--secondary"
                            onClick={resetMapSearch}
                        >
                            Сбросить поиск по карте
                        </button>
                    </>
                )}
            </div>
        </div>
    )

    return (
        <div className="opportunities-page">
            <Navbar />

            <header className="opportunities-page__hero">
                <div className="container opportunities-page__hero-inner">
                    <h1>Твой карьерный трамплин в IT</h1>
                    <p>Находи стажировки, вакансии и карьерные события. Смотри на карте и в ленте карточек.</p>

                    <OpportunityFiltersPanel
                        filters={filters}
                        salaryRange={salaryRange}
                        tags={tags}
                        selectedTags={selectedTags}
                        typeOptions={TYPE_OPTIONS}
                        formatOptions={FORMAT_OPTIONS}
                        cityQuery={cityQuery}
                        citySuggestions={citySuggestions}
                        isCitySuggestionsOpen={isCitySuggestionsOpen}
                        cityActiveIndex={cityActiveIndex}
                        onSearchChange={handleSearchChange}
                        onSkillsChange={handleSkillsChange}
                        onTypeChange={handleTypeChange}
                        onFormatChange={handleFormatChange}
                        onCityQueryChange={handleCityQueryChange}
                        onCitySelect={handleCitySelect}
                        onCityOpenChange={setIsCitySuggestionsOpen}
                        onCityActiveIndexChange={setCityActiveIndex}
                        onSalaryFromChange={handleSalaryFromChange}
                        onSalaryToChange={handleSalaryToChange}
                        onTagClick={handleTagClick}
                        onReset={resetAllFilters}
                        isResetDisabled={!hasActiveFilters}
                        formatCitySuggestionLabel={formatCitySuggestionLabel}
                    />
                </div>
            </header>

            <main className="container opportunities-page__main">
                {isApplicant && (
                    <PersonalizedRecommendationsSection
                        items={personalizedRecommendations}
                        isLoading={isRecommendationsLoading}
                        error={recommendationsError}
                        isOpen={isRecommendationsOpen}
                        hasRequested={hasRequestedRecommendations}
                        onToggleOpen={togglePersonalizedRecommendations}
                        onOpenOpportunity={(id) => navigate(`/opportunities/${id}`)}
                        onApply={handleApply}
                        onToggleFavorite={toggleOpportunityFavorite}
                        favoriteOpportunities={favoriteOpportunities}
                    />
                )}

                <section className="opportunities-page__toolbar">
                    <h2>Найдено возможностей: {visibleTotal}</h2>

                    <div className="opportunities-page__view-switcher">
                        <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="8" y1="6" x2="21" y2="6" />
                                <line x1="8" y1="12" x2="21" y2="12" />
                                <line x1="8" y1="18" x2="21" y2="18" />
                                <line x1="3" y1="6" x2="3.01" y2="6" />
                                <line x1="3" y1="12" x2="3.01" y2="12" />
                                <line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                            <span>Лента</span>
                        </button>

                        <button className={viewMode === 'map' ? 'is-active' : ''} onClick={() => setViewMode('map')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span>Карта</span>
                        </button>
                    </div>
                </section>

                {error && <p className="opportunities-page__error">{error}</p>}
                {isLoading && <OpportunityCatalogSkeleton viewMode={viewMode} />}

                {showGlobalEmpty && (
                    <OpportunityEmptyState
                        title={hasActiveFilters ? 'Ничего не найдено' : 'В каталоге пока пусто'}
                        description={hasActiveFilters ? 'Попробуйте убрать часть фильтров или изменить запрос.' : 'Когда появятся опубликованные возможности, они будут показаны здесь.'}
                        actionLabel={hasActiveFilters ? 'Сбросить фильтры' : ''}
                        onAction={hasActiveFilters ? resetAllFilters : null}
                    />
                )}

                {!isLoading && !error && viewMode === 'map' && (
                    <section className="opportunities-page__content">
                        <div className="opportunities-page__map-layout">
                            <div className="opportunities-page__map-side-list">
                                {showMapEmpty ? (
                                    <OpportunityEmptyState
                                        title={isMapSearchActive ? 'В выбранной области ничего нет' : (hasActiveFilters ? 'Ничего не найдено' : 'В каталоге пока пусто')}
                                        description={isMapSearchActive ? 'Передвиньте карту или вернитесь к общему списку.' : (hasActiveFilters ? 'Попробуйте убрать часть фильтров или изменить запрос.' : 'Когда появятся опубликованные возможности, они будут показаны здесь.')}
                                        actionLabel={isMapSearchActive ? 'Показать все' : (hasActiveFilters ? 'Сбросить фильтры' : '')}
                                        onAction={isMapSearchActive ? resetMapSearch : (hasActiveFilters ? resetAllFilters : null)}
                                        compact
                                    />
                                ) : (
                                    mapSideOpportunities.map((item) => (
                                        <OpportunityCompactCard
                                            key={item.id}
                                            item={item}
                                            isOpportunityFavorite={favoriteOpportunities.has(item.id)}
                                            isCompanyFavorite={isCompanyFavoriteForItem(item)}
                                            onToggleOpportunityFavorite={toggleOpportunityFavorite}
                                            onToggleCompanyFavorite={toggleCompanyFavorite}
                                            onShowOnMap={handleShowOnMap}
                                        />
                                    ))
                                )}

                                {visibleTotal > MAP_SIDE_LIMIT && !showMapEmpty && (
                                    <div className="opportunities-page__map-pagination">
                                        <button type="button" onClick={() => goToPage(page - 1)} disabled={page === 0}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                                 stroke="currentColor" strokeWidth="2">
                                                <path d="M15 18L9 12L15 6"/>
                                            </svg>
                                        </button>
                                        <span>{page + 1} / {totalPages}</span>
                                        <button type="button" onClick={() => goToPage(page + 1)}
                                                disabled={page + 1 >= totalPages}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                                 stroke="currentColor" strokeWidth="2">
                                                <path d="M9 18L15 12L9 6"/>
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="opportunities-page__map-wrap" ref={mapWrapRef}>
                                {shouldShowMapControls && (
                                    <div className="opportunities-page__map-overlay-controls">
                                        {mapControlsContent}
                                    </div>
                                )}

                                <LazyYandexOpportunityMap
                                    points={visibleMapPoints}
                                    favoriteCompanies={favoriteCompanies}
                                    favoriteOpportunities={favoriteOpportunities}
                                    focusedOpportunityId={focusedOpportunityId}
                                    onOpenCard={handleOpenCard}
                                    onOpenDetails={handleOpenDetails}
                                    onToggleOpportunityFavorite={toggleOpportunityFavorite}
                                    onCenterChange={handleMapCenterChange}
                                />
                            </div>
                        </div>
                    </section>
                )}

                {!isLoading && !error && viewMode === 'list' && opportunities.length > 0 && (
                    <section className="opportunities-page__content">
                        <div className="opportunities-page__cards-grid">
                            {opportunities.map((item) => (
                                <OpportunityListCard
                                    key={item.id}
                                    item={item}
                                    isApplicant={isApplicant}
                                    isApplied={appliedOpportunityIds.has(Number(item.id))}
                                    isOpportunityFavorite={favoriteOpportunities.has(item.id)}
                                    isCompanyFavorite={isCompanyFavoriteForItem(item)}
                                    onToggleOpportunityFavorite={toggleOpportunityFavorite}
                                    onToggleCompanyFavorite={toggleCompanyFavorite}
                                    onShowOnMap={handleShowOnMap}
                                    onApply={handleApply}
                                />
                            ))}
                        </div>

                        <div className="opportunities-page__pagination">
                            <button type="button" onClick={() => goToPage(page - 1)} disabled={page === 0}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2">
                                    <path d="M15 18L9 12L15 6"/>
                                </svg>
                                <span>Назад</span>
                            </button>
                            <span>{page + 1} / {totalPages}</span>
                            <button type="button" onClick={() => goToPage(page + 1)} disabled={page + 1 >= totalPages}>
                                <span>Вперёд</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2">
                                    <path d="M9 18L15 12L9 6"/>
                                </svg>
                            </button>
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}

export default OpportunitiesPage
