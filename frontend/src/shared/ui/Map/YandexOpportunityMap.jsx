import { useEffect, useMemo, useRef, useState } from 'react'
import { OPPORTUNITY_LABELS } from '@/shared/api/opportunities'
import './YandexOpportunityMap.scss'

const YMAPS_API_KEY = import.meta.env.VITE_YMAPS_API_KEY

let ymapsScriptPromise = null

function loadYmaps() {
    if (window.ymaps) return Promise.resolve(window.ymaps)
    if (ymapsScriptPromise) return ymapsScriptPromise

    ymapsScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YMAPS_API_KEY}&lang=ru_RU`
        script.async = true

        script.onload = () => {
            if (!window.ymaps) {
                reject(new Error('Yandex Maps API не загрузился'))
                return
            }

            window.ymaps.ready(() => resolve(window.ymaps))
        }

        script.onerror = () => reject(new Error('Не удалось загрузить Yandex Maps API'))
        document.head.appendChild(script)
    })

    return ymapsScriptPromise
}

function formatMoney(from, to, currency) {
    if (from == null && to == null) return 'По договорённости'

    const values = []
    if (from != null) values.push(`от ${Number(from).toLocaleString('ru-RU')}`)
    if (to != null) values.push(`до ${Number(to).toLocaleString('ru-RU')}`)

    return `${values.join(' ')} ${currency || ''}`.trim()
}

function escapeHtml(value) {
    if (!value && value !== 0) return ''

    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function normalizeOpportunityId(id) {
    if (id === null || id === undefined) return ''
    return String(id)
}

function isPointEmployerVerified(point) {
    const preview = point.preview || {}
    return Boolean(point.employerVerified || preview.employerVerified) ||
        point.employerVerificationStatus === 'APPROVED' ||
        preview.employerVerificationStatus === 'APPROVED'
}

function buildVerifiedCompanyBadgeHtml(point) {
    if (!isPointEmployerVerified(point)) return ''

    return `
        <span class="yandex-opportunity-map__verified-badge" title="Компания прошла проверку на платформе">
            <span aria-hidden="true">✓</span>
            <span>Проверенная компания</span>
        </span>
    `
}

function markerSvg(color) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 1C9.268 1 3 7.268 3 15c0 11 14 28 14 28s14-17 14-28C31 7.268 24.732 1 17 1z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="17" cy="15" r="5" fill="#ffffff"/>
        </svg>
    `)}`
}

function buildBalloon(point, isOpportunityFavorite = false) {
    const preview = point.preview || {}
    const tags = (preview.tags || [])
        .slice(0, 4)
        .map(
            (tag) => `
                <span class="yandex-opportunity-map__tag">
                    ${escapeHtml(tag.name)}
                </span>
            `
        )
        .join('')

    const title = preview.title || point.title
    const companyName = preview.companyName || point.companyName
    const typeLabel = OPPORTUNITY_LABELS.type[point.type] || 'Возможность'
    const rawWorkFormat =
        preview.workFormat ||
        point.workFormat ||
        preview.format ||
        point.format ||
        ''

    const formatLabel =
        OPPORTUNITY_LABELS.workFormat[rawWorkFormat] ||
        rawWorkFormat ||
        'Формат не указан'
    const salary = formatMoney(preview.salaryFrom, preview.salaryTo, preview.salaryCurrency)

    return `
        <div class="yandex-opportunity-map__popup yandex-opportunity-map__popup--balloon">
            <div class="yandex-opportunity-map__header">
                <h4 class="yandex-opportunity-map__title">
                    ${escapeHtml(title)}
                </h4>

                <span class="yandex-opportunity-map__badge yandex-opportunity-map__badge--type">
                    ${escapeHtml(typeLabel)}
                </span>
            </div>

            <p class="yandex-opportunity-map__company">
                ${escapeHtml(companyName)}
            </p>

            ${buildVerifiedCompanyBadgeHtml(point)}

            <div class="yandex-opportunity-map__badges">
                <span class="yandex-opportunity-map__badge">
                    ${escapeHtml(formatLabel)}
                </span>

                <span class="yandex-opportunity-map__badge yandex-opportunity-map__badge--salary">
                    ${escapeHtml(salary)}
                </span>
            </div>

            <p class="yandex-opportunity-map__address">
                ${escapeHtml(point.addressLine || point.cityName || 'Адрес не указан')}
            </p>

            <p class="yandex-opportunity-map__description">
                ${escapeHtml(preview.shortDescription || '')}
            </p>

            ${tags ? `<div class="yandex-opportunity-map__tags">${tags}</div>` : ''}

            <div class="yandex-opportunity-map__actions">
                <button
                    type="button"
                    class="yandex-opportunity-map__action yandex-opportunity-map__action--primary"
                    data-map-action="details"
                    data-opportunity-id="${escapeHtml(point.id)}"
                >
                    Подробнее
                </button>
                <button
                    type="button"
                    class="yandex-opportunity-map__action yandex-opportunity-map__action--favorite ${isOpportunityFavorite ? 'is-favorite' : ''}"
                    data-map-action="favorite"
                    data-opportunity-id="${escapeHtml(point.id)}"
                >
                    ${isOpportunityFavorite ? 'В избранном' : 'В избранное'}
                </button>
            </div>
        </div>
    `
}

function buildHint(point) {
    const preview = point.preview || {}
    const tags = (preview.tags || [])
        .slice(0, 3)
        .map(
            (tag) => `
                <span class="yandex-opportunity-map__tag yandex-opportunity-map__tag--hint">
                    ${escapeHtml(tag.name)}
                </span>
            `
        )
        .join('')

    const title = preview.title || point.title
    const companyName = preview.companyName || point.companyName
    const typeLabel = OPPORTUNITY_LABELS.type[point.type] || 'Возможность'
    const rawWorkFormat =
        preview.workFormat ||
        point.workFormat ||
        preview.format ||
        point.format ||
        ''

    const formatLabel =
        OPPORTUNITY_LABELS.workFormat[rawWorkFormat] ||
        rawWorkFormat ||
        'Формат не указан'
    const salary = formatMoney(preview.salaryFrom, preview.salaryTo, preview.salaryCurrency)

    return `
        <div class="yandex-opportunity-map__popup yandex-opportunity-map__popup--hint">
            <div class="yandex-opportunity-map__header">
                <h4 class="yandex-opportunity-map__title">
                    ${escapeHtml(title)}
                </h4>

                <span class="yandex-opportunity-map__badge yandex-opportunity-map__badge--type">
                    ${escapeHtml(typeLabel)}
                </span>
            </div>

            <p class="yandex-opportunity-map__company">
                ${escapeHtml(companyName)}
            </p>

            <div class="yandex-opportunity-map__badges">
                <span class="yandex-opportunity-map__badge">
                    ${escapeHtml(formatLabel)}
                </span>

                <span class="yandex-opportunity-map__badge yandex-opportunity-map__badge--salary">
                    ${escapeHtml(salary)}
                </span>
            </div>

            ${tags ? `<div class="yandex-opportunity-map__tags">${tags}</div>` : ''}
        </div>
    `
}

export default function YandexOpportunityMap({
                                                 points,
                                                 favoriteCompanies,
                                                 favoriteOpportunities = new Set(),
                                                 focusedOpportunityId,
                                                 onOpenCard,
                                                 onOpenDetails,
                                                 onToggleOpportunityFavorite,
                                                 onCenterChange,
                                             }) {
    const rootRef = useRef(null)
    const mapRef = useRef(null)
    const ymapsRef = useRef(null)
    const placemarksRef = useRef(new Map())
    const focusRetryRef = useRef(null)
    const resizeObserverRef = useRef(null)
    const suppressCenterEventRef = useRef(false)
    const lastMarkerClickAtRef = useRef(0)
    const lastPointsSignatureRef = useRef('')
    const onOpenCardRef = useRef(onOpenCard)
    const onOpenDetailsRef = useRef(onOpenDetails)
    const onToggleOpportunityFavoriteRef = useRef(onToggleOpportunityFavorite)
    const onCenterChangeRef = useRef(onCenterChange)
    const pointsByIdRef = useRef(new Map())
    const didInitialCenterRef = useRef(false)
    const [isTouchMode, setIsTouchMode] = useState(false)
    const [isMapReady, setIsMapReady] = useState(false)

    const center = useMemo(() => {
        const first = points.find((point) => point.latitude && point.longitude)
        if (!first) return [55.751244, 37.618423]
        return [first.latitude, first.longitude]
    }, [points])

    const pointsSignature = useMemo(() => {
        return points
            .filter((point) => point.latitude && point.longitude)
            .map((point) => `${point.id}:${point.latitude}:${point.longitude}`)
            .join('|')
    }, [points])

    const favoriteCompaniesSignature = useMemo(() => {
        return Array.from(favoriteCompanies).sort().join('|')
    }, [favoriteCompanies])

    const favoriteOpportunitiesSignature = useMemo(() => {
        return Array.from(favoriteOpportunities || []).map(normalizeOpportunityId).sort().join('|')
    }, [favoriteOpportunities])

    const favoriteOpportunityIds = useMemo(() => {
        return new Set(Array.from(favoriteOpportunities || []).map(normalizeOpportunityId))
    }, [favoriteOpportunities])

    useEffect(() => {
        onOpenCardRef.current = onOpenCard
        onOpenDetailsRef.current = onOpenDetails
        onToggleOpportunityFavoriteRef.current = onToggleOpportunityFavorite
        onCenterChangeRef.current = onCenterChange
    }, [onOpenCard, onOpenDetails, onToggleOpportunityFavorite, onCenterChange])

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined

        const mediaQuery = window.matchMedia('(hover: none), (pointer: coarse)')
        const updateTouchMode = () => setIsTouchMode(mediaQuery.matches)

        updateTouchMode()

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', updateTouchMode)
            return () => mediaQuery.removeEventListener('change', updateTouchMode)
        }

        mediaQuery.addListener(updateTouchMode)
        return () => mediaQuery.removeListener(updateTouchMode)
    }, [])

    useEffect(() => {
        let isDisposed = false

        async function initMap() {
            const ymaps = await loadYmaps()
            if (isDisposed || !rootRef.current) return
            ymapsRef.current = ymaps

            if (!mapRef.current) {
                mapRef.current = new ymaps.Map(rootRef.current, {
                    center,
                    zoom: 5,
                    controls: ['zoomControl', 'typeSelector', 'fullscreenControl'],
                })
            }
            setIsMapReady(true)

            const map = mapRef.current

            requestAnimationFrame(() => {
                map.container.fitToViewport()
            })

            if (!map.__centerChangeBound) {
                map.events.add('actionbegin', () => {
                    const isRecentMarkerClick = Date.now() - lastMarkerClickAtRef.current < 700
                    if (suppressCenterEventRef.current || isRecentMarkerClick) return

                    map.balloon?.close?.()
                    map.hint?.close?.()
                    placemarksRef.current.forEach((placemark) => {
                        placemark.balloon?.close?.()
                    })
                })

                map.events.add('actionend', () => {
                    if (suppressCenterEventRef.current) return
                    if (!onCenterChangeRef.current) return

                    const currentCenter = map.getCenter()
                    if (!currentCenter || currentCenter.length < 2) return

                    onCenterChangeRef.current({
                        lat: currentCenter[0],
                        lng: currentCenter[1],
                    })
                })

                map.__centerChangeBound = true
            }
        }

        initMap().catch(() => {})

        return () => {
            isDisposed = true
            if (focusRetryRef.current) {
                clearTimeout(focusRetryRef.current)
            }
        }
    }, [center])

    useEffect(() => {
        const root = rootRef.current
        const map = mapRef.current
        if (!root || !map || typeof ResizeObserver === 'undefined') return

        const handleResize = () => {
            requestAnimationFrame(() => {
                map.container.fitToViewport()
            })
        }

        const observer = new ResizeObserver(() => {
            handleResize()
        })

        observer.observe(root)
        resizeObserverRef.current = observer

        return () => {
            observer.disconnect()
            resizeObserverRef.current = null
        }
    }, [isMapReady])

    useEffect(() => {
        const root = rootRef.current
        if (!root) return undefined

        const handleBalloonAction = (event) => {
            const button = event.target.closest('[data-map-action]')
            if (!button || !root.contains(button)) return

            const action = button.dataset.mapAction
            const id = button.dataset.opportunityId
            if (!id) return

            event.preventDefault()
            event.stopPropagation()

            if (action === 'details') {
                onOpenDetailsRef.current?.(id)
                return
            }

            if (action === 'favorite') {
                const point = pointsByIdRef.current.get(normalizeOpportunityId(id))
                if (point) {
                    onToggleOpportunityFavoriteRef.current?.(point)
                }
            }
        }

        root.addEventListener('click', handleBalloonAction)
        return () => root.removeEventListener('click', handleBalloonAction)
    }, [])

    useEffect(() => {
        const map = mapRef.current
        if (!isMapReady || !map?.behaviors) return

        const allTouchBehaviors = ['drag', 'multiTouch', 'scrollZoom', 'dblClickZoom']
        const safeTouchBehaviors = ['drag', 'multiTouch']
        const noisyTouchBehaviors = ['scrollZoom', 'dblClickZoom']

        if (isTouchMode) {
            map.behaviors.enable(safeTouchBehaviors)
            map.behaviors.disable(noisyTouchBehaviors)
        } else {
            map.behaviors.enable(allTouchBehaviors)
        }
    }, [isMapReady, isTouchMode])

    useEffect(() => {
        const ymaps = ymapsRef.current
        const map = mapRef.current
        if (!isMapReady || !ymaps || !map) return

        map.geoObjects.removeAll()
        placemarksRef.current.clear()
        pointsByIdRef.current.clear()

        points
            .filter((point) => point.latitude && point.longitude)
            .forEach((point) => {
                const isFavorite = favoriteCompanies.has(point.companyName)
                const isOpportunityFavorite = favoriteOpportunityIds.has(normalizeOpportunityId(point.id))
                pointsByIdRef.current.set(normalizeOpportunityId(point.id), point)
                const placemarkState = isTouchMode
                    ? {}
                    : {
                        balloonContentBody: buildBalloon(point, isOpportunityFavorite),
                        hintContent: buildHint(point),
                    }

                const placemark = new ymaps.Placemark(
                    [point.latitude, point.longitude],
                    placemarkState,
                    {
                        iconLayout: 'default#imageWithContent',
                        iconImageHref: markerSvg(isFavorite ? '#f59f0a' : '#0f5f68'),
                        iconImageSize: [34, 44],
                        iconImageOffset: [-17, -44],
                        hasBalloon: !isTouchMode,
                        openBalloonOnClick: !isTouchMode,
                        hintOpenTimeout: isTouchMode ? 0 : 80,
                        hintCloseTimeout: 0,
                        hintFitPane: !isTouchMode,
                        hintOffset: [18, -12],
                        balloonMaxWidth: 340,
                        balloonPanelMaxMapArea: 0,
                        balloonAutoPan: !isTouchMode,
                        balloonAutoPanDuration: 300,
                        balloonAutoPanCheckZoomRange: true,
                        balloonAutoPanMargin: [40, 40, 40, 40],
                        balloonAutoPanUseMapMargin: true,
                        hideIconOnBalloonOpen: false,
                    }
                )

                placemark.events.add('click', () => {
                    lastMarkerClickAtRef.current = Date.now()
                    onOpenCardRef.current?.(point.id)
                })

                map.geoObjects.add(placemark)
                placemarksRef.current.set(normalizeOpportunityId(point.id), placemark)
            })

        if (!didInitialCenterRef.current) {
            suppressCenterEventRef.current = true

            const focusedPlacemark = focusedOpportunityId
                ? placemarksRef.current.get(normalizeOpportunityId(focusedOpportunityId))
                : null
            const geoPoints = points.filter((point) => point.latitude && point.longitude)

            if (focusedPlacemark) {
                const coords = focusedPlacemark.geometry.getCoordinates()
                map.setCenter(coords, 14, { checkZoomRange: true })
            } else if (geoPoints.length === 1) {
                map.setCenter([geoPoints[0].latitude, geoPoints[0].longitude], 14, { checkZoomRange: true })
            } else {
                map.setCenter([55.751244, 37.618423], 5)
            }

            setTimeout(() => {
                suppressCenterEventRef.current = false
            }, 300)

            didInitialCenterRef.current = true
            lastPointsSignatureRef.current = pointsSignature
        } else if (lastPointsSignatureRef.current !== pointsSignature) {
            lastPointsSignatureRef.current = pointsSignature
        }

        map.container.fitToViewport()
    }, [center, favoriteCompanies, favoriteCompaniesSignature, favoriteOpportunityIds, favoriteOpportunitiesSignature, focusedOpportunityId, isMapReady, isTouchMode, points, pointsSignature])

    useEffect(() => {
        if (!focusedOpportunityId || !mapRef.current) return

        const tryFocus = (attempt = 0) => {
            const map = mapRef.current
            const placemark = placemarksRef.current.get(normalizeOpportunityId(focusedOpportunityId))

            if (!map || !placemark) {
                if (attempt < 8) {
                    focusRetryRef.current = setTimeout(
                        () => tryFocus(attempt + 1),
                        120
                    )
                }
                return
            }

            try {
                map.container.fitToViewport()
                const coords = placemark.geometry.getCoordinates()
                const ymapsApi = ymapsRef.current

                suppressCenterEventRef.current = true

                if (ymapsApi?.util?.bounds) {
                    const bounds = ymapsApi.util.bounds.fromPoints([coords])
                    map.setBounds(bounds, {
                        checkZoomRange: true,
                        zoomMargin: [120, 120, 120, 120],
                        duration: 350,
                    }).then(() => {
                        if (map.getZoom() > 14) {
                            map.setZoom(14, { duration: 200, checkZoomRange: true })
                        }
                    }).catch(() => {
                        map.setCenter(coords, 14, { duration: 350, checkZoomRange: true })
                    })
                } else {
                    map.setCenter(coords, 14, { duration: 350, checkZoomRange: true })
                }

                setTimeout(() => {
                    suppressCenterEventRef.current = false
                }, 450)

                if (!isTouchMode) {
                    placemark.balloon.open()
                }
            } catch {
                suppressCenterEventRef.current = false
            }
        }

        if (focusRetryRef.current) clearTimeout(focusRetryRef.current)
        tryFocus()

        return () => {
            if (focusRetryRef.current) {
                clearTimeout(focusRetryRef.current)
            }
        }
    }, [focusedOpportunityId, isTouchMode, points])

    return (
        <div className="yandex-opportunity-map__surface">
            <div ref={rootRef} className="opportunities-page__map" />
        </div>
    )
}
