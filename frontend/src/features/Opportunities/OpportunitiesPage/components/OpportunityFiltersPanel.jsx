import Autocomplete from '@/shared/ui/Autocomplete'
import CustomSelect from '@/shared/ui/CustomSelect'
import Input from '@/shared/ui/Input'
import OpportunityTagSearchFilter from './OpportunityTagSearchFilter'

export default function OpportunityFiltersPanel({
    filters,
    salaryRange,
    tags,
    selectedTags,
    typeOptions,
    formatOptions,
    cityQuery,
    citySuggestions,
    isCitySuggestionsOpen,
    cityActiveIndex,
    onSearchChange,
    onSkillsChange,
    onTypeChange,
    onFormatChange,
    onCityQueryChange,
    onCitySelect,
    onCityOpenChange,
    onCityActiveIndexChange,
    onSalaryFromChange,
    onSalaryToChange,
    onTagClick,
    onReset,
    isResetDisabled,
    formatCitySuggestionLabel,
}) {
    return (
        <div className="opportunities-page__filters-panel">
            <div className="opportunities-page__filters-grid">
                <Input
                    value={filters.search}
                    onChange={onSearchChange}
                    placeholder="Название, компания, описание"
                    maxLength={120}
                />
                <Input
                    value={filters.skillsQuery}
                    onChange={onSkillsChange}
                    placeholder="Навыки"
                />
                <CustomSelect
                    value={filters.type}
                    onChange={onTypeChange}
                    options={typeOptions}
                />
                <CustomSelect
                    value={filters.format}
                    onChange={onFormatChange}
                    options={formatOptions}
                />
                <Autocomplete
                    value={cityQuery}
                    onChange={onCityQueryChange}
                    suggestions={citySuggestions}
                    isOpen={isCitySuggestionsOpen}
                    onOpenChange={onCityOpenChange}
                    activeIndex={cityActiveIndex}
                    onActiveIndexChange={onCityActiveIndexChange}
                    placeholder="Город"
                    onSelect={onCitySelect}
                    getSuggestionValue={formatCitySuggestionLabel}
                    getSuggestionKey={(city) => city.id}
                />
                <div className="opportunities-page__salary-inline">
                    <span className="opportunities-page__salary-label">Зарплата</span>
                    <Input
                        type="number"
                        value={salaryRange.from}
                        onChange={onSalaryFromChange}
                        placeholder="от"
                        min="0"
                        className="opportunities-page__salary-input salary-input"
                        aria-label="Зарплата от"
                    />
                    <Input
                        type="number"
                        value={salaryRange.to}
                        onChange={onSalaryToChange}
                        placeholder="до"
                        min="0"
                        className="opportunities-page__salary-input salary-input"
                        aria-label="Зарплата до"
                    />
                    <span className="opportunities-page__salary-currency">₽</span>
                </div>
            </div>

            {tags.length > 0 && (
                <OpportunityTagSearchFilter
                    title="Теги"
                    placeholder="Найти тег"
                    tags={tags}
                    selectedTagIds={selectedTags}
                    onToggleTag={onTagClick}
                />
            )}

            <div className="opportunities-page__filters-actions">
                <button
                    type="button"
                    className="opportunities-page__reset-filters"
                    onClick={onReset}
                    disabled={isResetDisabled}
                >
                    Сбросить фильтры
                </button>
            </div>
        </div>
    )
}
