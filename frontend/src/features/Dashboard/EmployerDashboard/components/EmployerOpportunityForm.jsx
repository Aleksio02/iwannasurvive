import { useMemo, useState } from 'react'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import Label from '@/shared/ui/Label'
import Textarea from '@/shared/ui/Textarea'
import CustomSelect from '@/shared/ui/CustomSelect'
import LinksEditor from '@/shared/ui/LinksEditor'
import MediaGallery from './MediaGallery'

import {
    OPPORTUNITY_TYPES,
    WORK_FORMATS,
    EXPERIENCE_LEVELS,
    EMPLOYMENT_TYPES,
} from '../lib/employerDashboard.constants'

function EmployerOpportunityForm({
                                     isVerified,
                                     verificationState,
                                     isLoading,
                                     opportunityMode,
                                     opportunityForm,
                                     errors,
                                     techTags,
                                     isSuggestingTags,
                                     isGeneratingDescription,
                                     aiDescriptionNotes,
                                     isAiDescriptionOpen,
                                     employerLocations,
                                     resourceRows,
                                     setResourceRows,
                                     onResetOpportunityForm,
                                     onCancelOpportunityEdit,
                                     onSaveOpportunity,
                                     onSuggestTags,
                                     onChangeAiDescriptionNotes,
                                     onToggleAiDescription,
                                     onGenerateDescription,
                                     onChangeOpportunityForm,
                                     media,
                                     mediaOpportunityId,
                                     onMediaUpdate,
                                 }) {
    const normalizedOpportunityType = String(opportunityForm.type || '').trim().toUpperCase()
    const normalizedWorkFormat = String(opportunityForm.workFormat || '').trim().toUpperCase()
    const isEventType = normalizedOpportunityType === 'EVENT'
    const isRemoteLikeWorkFormat = ['REMOTE', 'ONLINE'].includes(normalizedWorkFormat)
    const isLocationEditingDisabled = isRemoteLikeWorkFormat
    const isOfficeBasedWorkFormat = ['OFFICE', 'HYBRID'].includes(normalizedWorkFormat)
    const isVerificationPending = verificationState === 'PENDING'
    const isVerificationRejected = verificationState === 'REJECTED'
    const isVerificationApproved = verificationState === 'APPROVED'
    const [tagSearchQuery, setTagSearchQuery] = useState('')
    const getFieldErrorClass = (field) => errors[field] ? 'is-invalid' : ''
    const availableWorkFormats = useMemo(() => {
        if (isEventType) {
            return WORK_FORMATS.filter((item) => ['OFFICE', 'ONLINE'].includes(item.value))
        }

        return WORK_FORMATS.filter((item) => ['OFFICE', 'HYBRID', 'REMOTE'].includes(item.value))
    }, [isEventType])
    const hasExistingDescription = Boolean(
        opportunityForm.shortDescription?.trim() ||
        opportunityForm.fullDescription?.trim() ||
        opportunityForm.requirements?.trim()
    )
    const selectedTagIds = useMemo(
        () => (Array.isArray(opportunityForm.tagIds) ? opportunityForm.tagIds : []),
        [opportunityForm.tagIds]
    )
    const selectedTags = useMemo(
        () => techTags.filter((tag) => selectedTagIds.includes(tag.id)),
        [selectedTagIds, techTags]
    )
    const availableTagSuggestions = useMemo(() => {
        const normalizedQuery = tagSearchQuery.trim().toLowerCase()
        return techTags
            .filter((tag) => !selectedTagIds.includes(tag.id))
            .filter((tag) => !normalizedQuery || tag.name.toLowerCase().includes(normalizedQuery))
            .slice(0, 6)
    }, [selectedTagIds, tagSearchQuery, techTags])

    const toggleTag = (tagId) => {
        onChangeOpportunityForm((prev) => ({
            ...prev,
            tagIds: prev.tagIds.includes(tagId)
                ? prev.tagIds.filter((id) => id !== tagId)
                : [...prev.tagIds, tagId],
        }))
    }

    return (
        <div className="employer-create-form">
            <div className="employer-create-form__header">
                <h2>{opportunityMode === 'edit' ? 'Редактирование публикации' : 'Новая публикация'}</h2>
                {opportunityMode === 'edit' && (
                    <Button className="button--outline employer-create-form__cancel-edit" onClick={onCancelOpportunityEdit}>
                        Отменить редактирование
                    </Button>
                )}
            </div>

            {!isVerificationApproved && (
                <p className="field-hint">
                    Создание и редактирование публикаций доступно после верификации компании.
                </p>
            )}

            {isVerificationPending && (
                <p className="field-hint field-hint--warning">
                    Верификация компании на проверке. Публикация новых карточек временно ограничена.
                </p>
            )}

            {isVerificationRejected && (
                <p className="field-hint field-hint--error">
                    Верификация компании отклонена. Для публикации новых карточек отправьте заявку повторно.
                </p>
            )}

            <div className="employer-create-form__field">
                <Label>Название <span className="required-star">*</span></Label>
                <Input
                    className={getFieldErrorClass('title')}
                    value={opportunityForm.title}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Например, Junior Java Developer"
                />
                <p className={`field-error ${errors.title ? '' : 'is-placeholder'}`}>{errors.title || '\u00A0'}</p>
            </div>

            <div className="employer-create-form__grid-2">
                <CustomSelect
                    label="Тип"
                    required={true}
                    value={opportunityForm.type}
                    onChange={(val) =>
                        onChangeOpportunityForm((prev) => {
                            const nextType = String(val || '').trim().toUpperCase()
                            const currentFormat = String(prev.workFormat || '').trim().toUpperCase()

                            if (nextType === 'EVENT' && !['OFFICE', 'ONLINE'].includes(currentFormat)) {
                                return {
                                    ...prev,
                                    type: val,
                                    workFormat: 'ONLINE',
                                    locationId: null,
                                    cityId: null,
                                    cityName: '',
                                    expiresAt: '',
                                }
                            }

                            if (nextType !== 'EVENT' && currentFormat === 'ONLINE') {
                                return {
                                    ...prev,
                                    type: val,
                                    workFormat: 'REMOTE',
                                    eventDate: '',
                                }
                            }

                            return {
                                ...prev,
                                type: val,
                                eventDate: nextType === 'EVENT' ? prev.eventDate : '',
                                expiresAt: nextType === 'EVENT' ? '' : prev.expiresAt,
                            }
                        })
                    }
                    options={OPPORTUNITY_TYPES}
                />
                <CustomSelect
                    label="Формат"
                    required={true}
                    value={opportunityForm.workFormat}
                    onChange={(val) =>
                        onChangeOpportunityForm((prev) => {
                            const isRemoteLike = ['REMOTE', 'ONLINE'].includes(
                                String(val || '').trim().toUpperCase()
                            )

                            return {
                                ...prev,
                                workFormat: val,
                                locationId: isRemoteLike ? null : prev.locationId,
                                cityId: isRemoteLike ? null : prev.cityId,
                                cityName: isRemoteLike ? '' : prev.cityName,
                            }
                        })
                    }
                    options={availableWorkFormats}
                />
            </div>

            <div className="employer-create-form__grid-2">
                <div className={isLocationEditingDisabled ? 'select-disabled' : ''}>
                    <CustomSelect
                        label="Офис"
                        required={isOfficeBasedWorkFormat}
                        value={opportunityForm.locationId ? String(opportunityForm.locationId) : ''}
                        error={errors.locationId}
                        onChange={(val) => {
                            if (isLocationEditingDisabled) return

                            const selectedLocation =
                                employerLocations.find((item) => String(item.id) === String(val)) || null

                            onChangeOpportunityForm((prev) => ({
                                ...prev,
                                locationId: selectedLocation?.id ?? null,
                                cityId: selectedLocation?.cityId ?? null,
                                cityName: selectedLocation?.cityName || selectedLocation?.city?.name || '',
                            }))
                        }}
                        options={[
                            {
                                value: '',
                                label: isLocationEditingDisabled
                                    ? 'Офис не требуется'
                                    : employerLocations.length
                                        ? 'Выберите офис'
                                        : 'Нет созданных офисов',
                            },
                            ...employerLocations.map((location) => ({
                                value: String(location.id),
                                label: [
                                    location.title,
                                    location.cityName || location.city?.name,
                                    location.addressLine,
                                ].filter(Boolean).join(' • '),
                            })),
                        ]}
                    />
                </div>

                <div className="employer-create-form__field">
                    <Label>Город</Label>
                    <Input
                        value={
                            !isLocationEditingDisabled
                                ? (opportunityForm.cityName || '')
                                : normalizedWorkFormat === 'ONLINE'
                                    ? 'Онлайн-мероприятие: используется город организатора'
                                    : 'Используется город из профиля компании'
                        }
                        readOnly
                        className={isLocationEditingDisabled ? 'input--disabled' : ''}
                        placeholder="Будет подставлен из офиса"
                    />
                </div>
            </div>

            <div className="employer-create-form__ai-description-card">
                <div className="employer-create-form__ai-description-header">
                    <div className="employer-create-form__ai-description-copy">
                        <h3 className="employer-create-form__ai-description-title">Помочь заполнить описание с ИИ</h3>
                        <p className="employer-create-form__ai-description-text">
                            ИИ подготовит краткое описание, полное описание и требования. Результат можно отредактировать.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="button button--outline employer-create-form__ai-description-toggle"
                        aria-expanded={isAiDescriptionOpen}
                        aria-controls="ai-description-panel"
                        onClick={onToggleAiDescription}
                        disabled={isGeneratingDescription}
                    >
                        {isAiDescriptionOpen ? 'Свернуть' : 'Раскрыть'}
                    </button>
                </div>
                {isAiDescriptionOpen && (
                    <div id="ai-description-panel" className="employer-create-form__ai-description-body">
                        <div className="employer-create-form__field">
                            <Label>Тезисы для ИИ</Label>
                            <Textarea
                                rows={3}
                                maxLength={2000}
                                value={aiDescriptionNotes}
                                onChange={(e) => onChangeAiDescriptionNotes(e.target.value)}
                                placeholder="Например: стажировка 3 месяца, Kotlin, Spring Boot, наставник, code review"
                            />
                        </div>
                        {hasExistingDescription && (
                            <p className="employer-create-form__ai-description-warning">
                                Новая генерация может заменить текущий текст в описании и требованиях.
                            </p>
                        )}
                        <Button
                            className="button--outline employer-create-form__ai-description-generate"
                            onClick={onGenerateDescription}
                            disabled={isLoading || isGeneratingDescription}
                        >
                            {isGeneratingDescription ? 'Генерируем...' : 'Сгенерировать описание'}
                        </Button>
                    </div>
                )}
            </div>

            <div className="employer-create-form__field">
                <Label>Краткое описание <span className="required-star">*</span></Label>
                <Textarea
                    className={getFieldErrorClass('shortDescription')}
                    rows={3}
                    value={opportunityForm.shortDescription}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
                    placeholder="Кратко: формат, аудитория, ключевая польза"
                />
                <p className={`field-error ${errors.shortDescription ? '' : 'is-placeholder'}`}>{errors.shortDescription || '\u00A0'}</p>
            </div>

            <div className="employer-create-form__field">
                <Label>Полное описание</Label>
                <Textarea
                    rows={5}
                    value={opportunityForm.fullDescription}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, fullDescription: e.target.value }))}
                    placeholder="Подробности о вакансии, стажировке, мероприятии или менторской программе"
                />
            </div>

            <div className="employer-create-form__field">
                <Label>Требования</Label>
                <Textarea
                    rows={4}
                    value={opportunityForm.requirements}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, requirements: e.target.value }))}
                    placeholder="Навыки, стек, ожидания к кандидату"
                />
            </div>

            <div className="employer-create-form__grid-3">
                <div className="employer-create-form__field">
                    <CustomSelect
                        label="Уровень"
                        value={opportunityForm.grade}
                        onChange={(val) => onChangeOpportunityForm((prev) => ({ ...prev, grade: val }))}
                        options={EXPERIENCE_LEVELS}
                    />
                    <p className="field-error is-placeholder">{'\u00A0'}</p>
                </div>
                <div className="employer-create-form__field">
                    <CustomSelect
                        label="Занятость"
                        value={opportunityForm.employmentType}
                        onChange={(val) => onChangeOpportunityForm((prev) => ({ ...prev, employmentType: val }))}
                        options={EMPLOYMENT_TYPES}
                    />
                    <p className="field-error is-placeholder">{'\u00A0'}</p>
                </div>
                {isEventType ? (
                    <div className="employer-create-form__field">
                        <Label>Дата мероприятия <span className="required-star">*</span></Label>
                        <Input
                            type="date"
                            className={`employer-create-form__date-input ${getFieldErrorClass('eventDate')}`.trim()}
                            value={opportunityForm.eventDate}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, eventDate: e.target.value }))}
                        />
                        <p className={`field-error ${errors.eventDate ? '' : 'is-placeholder'}`}>{errors.eventDate || '\u00A0'}</p>
                    </div>
                ) : (
                    <div className="employer-create-form__field">
                        <Label>Срок действия <span className="required-star">*</span></Label>
                        <Input
                            type="date"
                            className={`employer-create-form__date-input ${getFieldErrorClass('expiresAt')}`.trim()}
                            value={opportunityForm.expiresAt}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                        />
                        <p className={`field-error ${errors.expiresAt ? '' : 'is-placeholder'}`}>{errors.expiresAt || '\u00A0'}</p>
                    </div>
                )}
            </div>

            <div className="employer-create-form__grid-3">
                <div className="employer-create-form__field">
                    <Label>Зарплата от</Label>
                    <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        className={`employer-create-form__salary-input ${getFieldErrorClass('salaryFrom')}`.trim()}
                        value={opportunityForm.salaryFrom}
                        onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, salaryFrom: e.target.value }))}
                        placeholder="Например, 50000"
                    />
                    <p className={`field-error ${errors.salaryFrom ? '' : 'is-placeholder'}`}>{errors.salaryFrom || '\u00A0'}</p>
                </div>
                <div className="employer-create-form__field">
                    <Label>Зарплата до</Label>
                    <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        className={`employer-create-form__salary-input ${getFieldErrorClass('salaryTo')}`.trim()}
                        value={opportunityForm.salaryTo}
                        onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, salaryTo: e.target.value }))}
                        placeholder="Например, 100000"
                    />
                    <p className={`field-error ${errors.salaryTo ? '' : 'is-placeholder'}`}>{errors.salaryTo || '\u00A0'}</p>
                </div>
                <div className="employer-create-form__field">
                    <Label>Контактный email</Label>
                    <Input
                        value={opportunityForm.contactEmail}
                        onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                        placeholder="Контактный email"
                    />
                    <p className="field-error is-placeholder">{'\u00A0'}</p>
                </div>
            </div>

            <div className="employer-create-form__grid-3">
                <Input
                    value={opportunityForm.contactPhone}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="Телефон"
                />
                <Input
                    value={opportunityForm.contactTelegram}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, contactTelegram: e.target.value }))}
                    placeholder="Telegram"
                />
                <Input
                    value={opportunityForm.contactPerson}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="Контактное лицо"
                />
            </div>

            <div className="employer-create-form__field">
                <div className="employer-create-form__section-header">
                    <div>
                        <Label>Теги</Label>
                        <p className="field-hint employer-create-form__section-hint">
                            Выберите подходящие навыки или подберите их по описанию.
                        </p>
                    </div>
                    <Button
                        className="button--outline employer-create-form__suggest-tags-button"
                        onClick={onSuggestTags}
                        disabled={isLoading || isSuggestingTags}
                    >
                        {isSuggestingTags ? 'Подбираем...' : 'Предложить теги с помощью ИИ'}
                    </Button>
                </div>
                <div className="employer-create-form__tag-picker">
                    <div className="employer-create-form__selected-tags">
                        {selectedTags.length > 0 ? (
                            selectedTags.map((tag) => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    className="skill-tag skill-tag--active"
                                    onClick={() => toggleTag(tag.id)}
                                    aria-label={`Удалить тег ${tag.name}`}
                                >
                                    #{tag.name}
                                    <span aria-hidden="true">×</span>
                                </button>
                            ))
                        ) : (
                            <p className="field-hint">
                                Выберите теги из поиска или воспользуйтесь ИИ-подбором
                            </p>
                        )}
                    </div>

                    <Input
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        placeholder="Найти тег: Java, React, SQL..."
                    />

                    <div className="employer-create-form__tag-suggestions">
                        {availableTagSuggestions.length > 0 ? (
                            availableTagSuggestions.map((tag) => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    className="skill-tag"
                                    onClick={() => toggleTag(tag.id)}
                                >
                                    #{tag.name}
                                </button>
                            ))
                        ) : (
                            <p className="field-hint">Теги не найдены</p>
                        )}
                    </div>
                </div>
            </div>

            {opportunityMode === 'edit' && mediaOpportunityId && (
                <div className="employer-create-form__field">
                    <Label>Медиафайлы</Label>
                    <MediaGallery
                        opportunityId={mediaOpportunityId}
                        media={media || []}
                        onMediaUpdate={onMediaUpdate}
                    />
                </div>
            )}

            <LinksEditor
                label="Полезные ссылки / ресурсы"
                rows={resourceRows}
                setRows={setResourceRows}
                placeholderTitle="Название ссылки"
                placeholderUrl="https://..."
            />

            <div className="employer-create-form__actions">
                <Button className="button--primary" onClick={onSaveOpportunity} disabled={isLoading || !isVerified}>
                    {isLoading ? 'Сохранение...' : opportunityMode === 'edit' ? 'Сохранить изменения' : 'Опубликовать'}
                </Button>
                <Button className="button--ghost" onClick={onResetOpportunityForm}>
                    Очистить форму
                </Button>
            </div>
        </div>
    )
}

export default EmployerOpportunityForm
