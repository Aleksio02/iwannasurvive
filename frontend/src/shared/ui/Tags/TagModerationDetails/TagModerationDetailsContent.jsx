import React from 'react'
import { getTagCategoryLabel } from '@/shared/lib/utils/tagCategories'
import {
  formatDate,
  getActionLabel,
  getPriorityLabel,
  getStatusLabel,
  getTaskTypeLabel,
} from '@/shared/lib/utils/moderationHelpers'
import TagStatusBadge from '@/shared/ui/Tags/TagStatusBadge/TagStatusBadge.jsx'
import styles from './TagModerationDetails.module.scss'

const SOURCE_LABELS = {
  EMPLOYER: 'Работодатель',
  CURATOR: 'Куратор',
  ADMIN: 'Администратор',
  SYSTEM: 'Система',
}

function valueOrDash(value) {
  if (value === null || value === undefined || value === '') return '—'
  return value
}

function getSourceLabel(source) {
  return SOURCE_LABELS[source] || valueOrDash(source)
}

function getActivityLabel(isActive) {
  if (isActive === true) return 'Активен'
  if (isActive === false) return 'Неактивен'
  return '—'
}

function Field({ label, children }) {
  return (
      <div className={styles.field}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{children}</span>
      </div>
  )
}

const TagModerationDetailsContent = ({ details, title, loading, error, onClose, fallbackTag }) => {
  const tag = details?.tag || fallbackTag
  const task = details?.task || null

  return (
      <>
        <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Закрыть">×</button>
        <h3>{title}</h3>

        {error && <div className={styles.error}>{error}</div>}

        {tag && (
            <div className={styles.content}>
              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Тег</h4>
                <Field label="Название">{valueOrDash(tag.name)}</Field>
                <Field label="Категория">{getTagCategoryLabel(tag.category)}</Field>
                <div className={styles.field}>
                  <span className={styles.label}>Статус тега</span>
                  <span className={`${styles.value} ${styles.badgeRow}`}>
                <TagStatusBadge status={tag.moderationStatus} />
              </span>
                </div>
                <Field label="Источник">{getSourceLabel(tag.createdByType)}</Field>
                <Field label="Активность">{getActivityLabel(tag.isActive)}</Field>
              </section>

              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Задача модерации</h4>
                {loading && <div className={styles.meta}>Загрузка...</div>}
                {!loading && task ? (
                    <>
                      <Field label="Номер задачи">#{task.id}</Field>
                      <Field label="Тип задачи">{getTaskTypeLabel(task.taskType)}</Field>
                      <Field label="Статус задачи">{getStatusLabel(task.status)}</Field>
                      <Field label="Приоритет">{getPriorityLabel(task.priority)}</Field>
                      <Field label="Создана">{formatDate(task.createdAt)}</Field>
                      <Field label="Обновлена">{formatDate(task.updatedAt)}</Field>
                      {task.resolvedAt && <Field label="Решена">{formatDate(task.resolvedAt)}</Field>}
                      {task.resolutionComment && (
                          <Field label="Комментарий">
                            <span className={styles.comment}>{task.resolutionComment}</span>
                          </Field>
                      )}
                      {Array.isArray(task.history) && task.history.length > 0 && (
                          <div className={styles.history}>
                            <strong>История изменений</strong>
                            <ul>
                              {task.history.map((item, idx) => (
                                  <li key={`${item.action || 'action'}-${item.createdAt || idx}`}>
                                    <span>{getActionLabel(item.action)}</span>
                                    <span className={styles.meta}>{formatDate(item.createdAt)}</span>
                                    {item.comment && <span className={styles.comment}>{item.comment}</span>}
                                  </li>
                              ))}
                            </ul>
                          </div>
                      )}
                    </>
                ) : (
                    !loading && !error && (
                        <div className={styles.emptyState}>
                          Для этого тега задача модерации пока не создавалась.
                        </div>
                    )
                )}
              </section>
            </div>
        )}
      </>
  )
}

export default TagModerationDetailsContent