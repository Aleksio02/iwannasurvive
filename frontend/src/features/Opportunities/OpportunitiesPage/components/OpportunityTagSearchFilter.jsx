import { useMemo, useState, useEffect } from 'react'
import Input from '@/shared/ui/Input'

const TAG_SUGGESTION_LIMIT = 10
const DESKTOP_TAG_SUGGESTION_LIMIT = 8
const MOBILE_TAG_SUGGESTION_LIMIT = 4

function normalizeTagName(value) {
    return String(value || '').trim().toLowerCase()
}

export default function OpportunityTagSearchFilter({
                                                       title,
                                                       placeholder,
                                                       tags,
                                                       selectedTagIds,
                                                       onToggleTag,
                                                   }) {
    const [search, setSearch] = useState('')
    const [isMobile, setIsMobile] = useState(false)
    const normalizedSearch = normalizeTagName(search)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const DEFAULT_TAG_SUGGESTION_LIMIT = isMobile ? MOBILE_TAG_SUGGESTION_LIMIT : DESKTOP_TAG_SUGGESTION_LIMIT

    const selectedTags = useMemo(
        () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
        [selectedTagIds, tags]
    )

    const visibleTags = useMemo(() => {
        const filteredTags = normalizedSearch
            ? tags.filter((tag) => normalizeTagName(tag.name).includes(normalizedSearch))
            : tags

        const unselectedTags = filteredTags.filter((tag) => !selectedTagIds.includes(tag.id))
        const suggestionLimit = normalizedSearch ? TAG_SUGGESTION_LIMIT : DEFAULT_TAG_SUGGESTION_LIMIT

        return [
            ...selectedTags,
            ...unselectedTags.slice(0, suggestionLimit),
        ]
    }, [normalizedSearch, selectedTagIds, selectedTags, tags, DEFAULT_TAG_SUGGESTION_LIMIT])

    const hasHiddenMatches = useMemo(() => {
        const matchingUnselectedCount = tags
            .filter((tag) => !selectedTagIds.includes(tag.id))
            .filter((tag) => !normalizedSearch || normalizeTagName(tag.name).includes(normalizedSearch))
            .length

        const suggestionLimit = normalizedSearch ? TAG_SUGGESTION_LIMIT : DEFAULT_TAG_SUGGESTION_LIMIT

        return matchingUnselectedCount > suggestionLimit
    }, [normalizedSearch, selectedTagIds, tags, DEFAULT_TAG_SUGGESTION_LIMIT])

    const hiddenMatchesCount = useMemo(() => {
        const matchingUnselectedCount = tags
            .filter((tag) => !selectedTagIds.includes(tag.id))
            .filter((tag) => !normalizedSearch || normalizeTagName(tag.name).includes(normalizedSearch))
            .length
        const suggestionLimit = normalizedSearch ? TAG_SUGGESTION_LIMIT : DEFAULT_TAG_SUGGESTION_LIMIT

        return Math.max(0, matchingUnselectedCount - suggestionLimit)
    }, [normalizedSearch, selectedTagIds, tags, DEFAULT_TAG_SUGGESTION_LIMIT])

    return (
        <div className="opportunities-page__tag-filter">
            <div className="opportunities-page__tag-filter-header">
                <span className="opportunities-page__filter-label">{title}</span>
                {selectedTagIds.length > 0 && (
                    <span className="opportunities-page__tag-counter">{selectedTagIds.length}</span>
                )}
            </div>

            <div className="opportunities-page__tag-search">
                <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={placeholder}
                />
                {search.trim() && (
                    <button
                        type="button"
                        className="opportunities-page__tag-search-clear"
                        onClick={() => setSearch('')}
                        aria-label="Очистить поиск по тегам"
                    >
                        ×
                    </button>
                )}
            </div>

            <div className="opportunities-page__tag-chips" aria-live="polite">
                {visibleTags.length === 0 ? (
                    <span className="opportunities-page__tag-inline-hint">
                        Ничего не найдено — попробуйте другой запрос.
                    </span>
                ) : (
                    visibleTags.map((tag) => {
                        const isActive = selectedTagIds.includes(tag.id)

                        return (
                            <button
                                key={tag.id}
                                type="button"
                                className={`opportunities-page__tag-chip ${isActive ? 'is-active' : ''}`}
                                onClick={() => onToggleTag(tag.id)}
                            >
                                #{tag.name}
                            </button>
                        )
                    })
                )}

                {normalizedSearch && hasHiddenMatches && (
                    <span className="opportunities-page__tag-inline-hint">
                        +{hiddenMatchesCount}
                    </span>
                )}
            </div>
        </div>
    )
}