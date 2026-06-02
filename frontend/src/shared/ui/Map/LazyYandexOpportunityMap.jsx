import { Suspense, lazy, useEffect, useState } from 'react'
import './LazyYandexOpportunityMap.scss'

const YandexOpportunityMap = lazy(() => import('./YandexOpportunityMap'))

function MapFallback() {
    return (
        <div className="lazy-yandex-opportunity-map__fallback" role="status" aria-live="polite">
            <div className="lazy-yandex-opportunity-map__spinner" aria-hidden="true" />
            <span>Загрузка карты...</span>
        </div>
    )
}

export default function LazyYandexOpportunityMap(props) {
    const [shouldRenderMap, setShouldRenderMap] = useState(false)

    useEffect(() => {
        if (shouldRenderMap) return undefined

        if (typeof window === 'undefined' || typeof window.requestIdleCallback !== 'function') {
            const timer = setTimeout(() => setShouldRenderMap(true), 120)
            return () => clearTimeout(timer)
        }

        const idleId = window.requestIdleCallback(
            () => {
                setShouldRenderMap(true)
            },
            { timeout: 800 }
        )

        return () => window.cancelIdleCallback(idleId)
    }, [shouldRenderMap])

    if (!shouldRenderMap) {
        return <MapFallback />
    }

    return (
        <Suspense fallback={<MapFallback />}>
            <YandexOpportunityMap {...props} />
        </Suspense>
    )
}
