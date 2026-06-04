import Button from '@/shared/ui/Button'
import { SearchX } from 'lucide-react'

export default function OpportunityEmptyState({
    title,
    description,
    actionLabel,
    onAction,
    compact = false,
}) {
    return (
        <div className={`opportunities-page__empty ${compact ? 'opportunities-page__empty--compact' : ''}`}>
            <div className="opportunities-page__empty-mark" aria-hidden="true">
                <SearchX size={22} strokeWidth={2} />
            </div>
            <div className="opportunities-page__empty-copy">
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
            {actionLabel && onAction && (
                <Button className="button--outline opportunities-page__empty-action" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    )
}
