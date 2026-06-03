const TAG_CATEGORY_LABELS = {
  TECH: 'Технологии',
  GRADE: 'Грейд',
  EMPLOYMENT_TYPE: 'Тип занятости',
  DIRECTION: 'Направление',
  BENEFIT: 'Бонусы',
  OTHER: 'Другое',
};

export const TAG_CATEGORY_OPTIONS = Object.entries(TAG_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function getTagCategoryLabel(category) {
  if (!category) return 'Не указана';
  return TAG_CATEGORY_LABELS[category] || category;
}
