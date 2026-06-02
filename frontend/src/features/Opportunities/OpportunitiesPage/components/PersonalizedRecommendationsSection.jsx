import Button from '@/shared/ui/Button'
import { OPPORTUNITY_LABELS } from '@/shared/api/opportunities'

function PersonalizedRecommendationsSection({
    items,
    isLoading,
    error,
    onOpenOpportunity,
    onApply,
    onToggleFavorite,
    favoriteOpportunities,
}) {
    if (!isLoading && error && items.length === 0) {
        return null
    }

    return (
        <section className="personalized-recommendations">
            <div className="personalized-recommendations__heading">
                <div>
                    <h2>Рекомендовано для вас</h2>
                    <p>Подборка по навыкам, формату и данным профиля.</p>
                </div>
            </div>

            {isLoading && (
                <div className="personalized-recommendations__state">Подбираем рекомендации...</div>
            )}

            {!isLoading && !error && items.length === 0 && (
                <div className="personalized-recommendations__state">
                    <strong>Пока нет персональных рекомендаций</strong>
                    <span>Добавьте навыки и город в профиль — подборка станет точнее.</span>
                </div>
            )}

            {!isLoading && items.length > 0 && (
                <div className="personalized-recommendations__grid">
                    {items.map((item) => {
                        const opportunity = item.opportunity
                        const explanation = item.explanation || {}
                        const whyFits = (explanation.whyFits || item.reasons || []).slice(0, 3)
                        const whatToImprove = (explanation.whatToImprove || item.improvementTips || []).slice(0, 3)

                        return (
                            <article key={opportunity.id} className="personalized-recommendations__card">
                                <div className="personalized-recommendations__card-top">
                                    <span className="personalized-recommendations__source">
                                        {explanation.source === 'AI' ? 'ИИ-пояснение' : 'На основе профиля'}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label="Изменить избранное"
                                        className={`opportunities-page__fav-star ${favoriteOpportunities.has(opportunity.id) ? 'is-favorite' : ''}`}
                                        onClick={() => onToggleFavorite(opportunity)}
                                    >
                                        ★
                                    </button>
                                </div>

                                <h3>{opportunity.title}</h3>
                                <p className="personalized-recommendations__company">{opportunity.companyName}</p>

                                <div className="personalized-recommendations__badges">
                                    <span>{OPPORTUNITY_LABELS.type[opportunity.type] || opportunity.type}</span>
                                    <span>{OPPORTUNITY_LABELS.workFormat[opportunity.workFormat] || opportunity.workFormat}</span>
                                    {opportunity.grade && <span>{OPPORTUNITY_LABELS.grade[opportunity.grade] || opportunity.grade}</span>}
                                </div>

                                {item.matchedSkills?.length > 0 && (
                                    <div className="personalized-recommendations__skills">
                                        {item.matchedSkills.map((skill) => <span key={skill}>{skill}</span>)}
                                    </div>
                                )}

                                <p className="personalized-recommendations__summary">{explanation.summary}</p>

                                {whyFits.length > 0 && (
                                    <div className="personalized-recommendations__list">
                                        <strong>Почему может подойти</strong>
                                        <ul>{whyFits.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                                    </div>
                                )}

                                {whatToImprove.length > 0 && (
                                    <div className="personalized-recommendations__list">
                                        <strong>Что подтянуть</strong>
                                        <ul>{whatToImprove.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                                    </div>
                                )}

                                <div className="personalized-recommendations__actions">
                                    <Button className="button--primary" onClick={() => onApply(opportunity)}>
                                        Откликнуться
                                    </Button>
                                    <Button className="button--outline" onClick={() => onOpenOpportunity(opportunity.id)}>
                                        Подробнее
                                    </Button>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </section>
    )
}

export default PersonalizedRecommendationsSection
