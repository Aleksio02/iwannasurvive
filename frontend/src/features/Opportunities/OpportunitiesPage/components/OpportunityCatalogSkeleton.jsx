function SkeletonLine({ className = '' }) {
    return <span className={`opportunities-page__skeleton-line ${className}`.trim()} />
}

function SkeletonCard({ compact = false }) {
    return (
        <article className={`opportunities-page__skeleton-card ${compact ? 'opportunities-page__skeleton-card--compact' : ''}`}>
            <div className="opportunities-page__skeleton-row">
                <SkeletonLine className="opportunities-page__skeleton-line--badge" />
                <SkeletonLine className="opportunities-page__skeleton-line--badge" />
            </div>
            <SkeletonLine className="opportunities-page__skeleton-line--title" />
            <SkeletonLine className="opportunities-page__skeleton-line--company" />
            <SkeletonLine />
            <SkeletonLine className="opportunities-page__skeleton-line--short" />
            <div className="opportunities-page__skeleton-row opportunities-page__skeleton-row--footer">
                <SkeletonLine className="opportunities-page__skeleton-line--button" />
                <SkeletonLine className="opportunities-page__skeleton-line--button" />
            </div>
        </article>
    )
}

export default function OpportunityCatalogSkeleton({ viewMode = 'list' }) {
    if (viewMode === 'map') {
        return (
            <section className="opportunities-page__content" aria-busy="true">
                <div className="opportunities-page__map-layout opportunities-page__map-layout--skeleton">
                    <div className="opportunities-page__map-side-list">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <SkeletonCard key={index} compact />
                        ))}
                    </div>
                    <div className="opportunities-page__map-skeleton">
                        <span className="opportunities-page__map-skeleton-pin" />
                        <span className="opportunities-page__map-skeleton-pin opportunities-page__map-skeleton-pin--second" />
                        <span className="opportunities-page__map-skeleton-pin opportunities-page__map-skeleton-pin--third" />
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section className="opportunities-page__content" aria-busy="true">
            <div className="opportunities-page__cards-grid">
                {Array.from({ length: 6 }).map((_, index) => (
                    <SkeletonCard key={index} />
                ))}
            </div>
        </section>
    )
}
