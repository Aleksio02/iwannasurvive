import { useMemo, useState } from 'react'
import Input from '@/shared/ui/Input'
import Label from '@/shared/ui/Label'
import './ApplicantTagsEditor.scss'

const MAX_SKILLS = 12
const MAX_INTERESTS = 8

function ApplicantTagSelector({
    label,
    placeholder,
    helper,
    availableTags,
    selectedTagIds,
    onTagIdsChange,
    maxCount,
    limitLabel,
    disabled,
    inputRef,
    onLimitError,
}) {
    const [search, setSearch] = useState('')
    const selectedTags = availableTags.filter((tag) => selectedTagIds.includes(tag.id))
    const options = availableTags
        .filter((tag) => !selectedTagIds.includes(tag.id))
        .filter((tag) => tag.name.toLowerCase().includes(search.trim().toLowerCase()))
        .slice(0, 12)

    const addTag = (tagId) => {
        if (disabled || selectedTagIds.includes(tagId)) return
        if (selectedTagIds.length >= maxCount) {
            onLimitError(`Можно выбрать до ${maxCount} ${limitLabel}`)
            return
        }
        onLimitError('')
        onTagIdsChange([...selectedTagIds, tagId])
    }

    const removeTag = (tagId) => {
        if (disabled) return
        onLimitError('')
        onTagIdsChange(selectedTagIds.filter((id) => id !== tagId))
    }

    return (
        <div className="applicant-tags-editor__selector">
            <div>
                <Label>{label}</Label>
                {helper && <p className="applicant-tags-editor__helper">{helper}</p>}
            </div>

            {selectedTags.length > 0 && (
                <div className="applicant-tags-editor__selected">
                    {selectedTags.map((tag) => (
                        <span key={tag.id} className="applicant-tags-editor__chip">
                            {tag.name}
                            <button type="button" onClick={() => removeTag(tag.id)} aria-label={`Удалить ${tag.name}`}>
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <Input
                ref={inputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={placeholder}
                disabled={disabled}
            />

            {options.length > 0 && (
                <div className="applicant-tags-editor__options">
                    {options.map((tag) => (
                        <button key={tag.id} type="button" onClick={() => addTag(tag.id)} disabled={disabled}>
                            + {tag.name}
                        </button>
                    ))}
                </div>
            )}

            <span className="applicant-tags-editor__counter">{selectedTagIds.length} / {maxCount}</span>
        </div>
    )
}

function ApplicantTagsEditor({
    availableTags = [],
    selectedSkillTagIds = [],
    selectedInterestTagIds = [],
    onSkillTagIdsChange,
    onInterestTagIdsChange,
    disabled = false,
    compact = false,
    layout = 'stacked',
    skillInputRef,
}) {
    const [limitError, setLimitError] = useState('')
    const skillOptions = useMemo(
        () => availableTags.filter((tag) =>
            tag.category === 'TECH' &&
            tag.isActive !== false &&
            (!tag.moderationStatus || tag.moderationStatus === 'APPROVED')
        ),
        [availableTags]
    )
    const interestOptions = useMemo(
        () => availableTags.filter((tag) =>
            tag.category === 'DIRECTION' &&
            tag.isActive !== false &&
            (!tag.moderationStatus || tag.moderationStatus === 'APPROVED')
        ),
        [availableTags]
    )

    return (
        <div className={`applicant-tags-editor applicant-tags-editor--${layout} ${compact ? 'is-compact' : ''}`}>
            <ApplicantTagSelector
                label="Навыки"
                placeholder="Найти навык"
                helper={compact ? '' : 'Выберите основные технологии.'}
                availableTags={skillOptions}
                selectedTagIds={selectedSkillTagIds}
                onTagIdsChange={onSkillTagIdsChange}
                maxCount={MAX_SKILLS}
                limitLabel="навыков"
                disabled={disabled}
                inputRef={skillInputRef}
                onLimitError={setLimitError}
            />
            <ApplicantTagSelector
                label="Интересы"
                placeholder="Найти направление"
                helper={compact ? '' : 'Выберите интересующие направления.'}
                availableTags={interestOptions}
                selectedTagIds={selectedInterestTagIds}
                onTagIdsChange={onInterestTagIdsChange}
                maxCount={MAX_INTERESTS}
                limitLabel="интересов"
                disabled={disabled}
                onLimitError={setLimitError}
            />
            {limitError && <p className="applicant-tags-editor__error">{limitError}</p>}
        </div>
    )
}

export default ApplicantTagsEditor
