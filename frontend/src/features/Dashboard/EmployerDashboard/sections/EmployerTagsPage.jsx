import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getEmployerTags, cancelEmployerTagModeration, createEmployerTag } from '@/shared/api/employerTag.js';
import TagStatusBadge from '@/shared/ui/Tags/TagStatusBadge/TagStatusBadge.jsx';
import TagModerationDetails from '@/shared/ui/Tags/TagModerationDetails/TagModerationDetails.jsx';
import CreateTagForm from '@/shared/ui/Tags/CreateTagForm/CreateTagForm.jsx';
import CustomSelect from '@/shared/ui/CustomSelect';
import { getTagCategoryLabel } from '@/shared/lib/utils/tagCategories';
import { useToast } from '@/shared/hooks/use-toast';
import styles from './EmployerTagsPage.module.scss';

const CancelTagModerationDialog = ({
  tag,
  loading,
  error,
  onClose,
  onConfirm,
}) => {
  const cancelButtonRef = useRef(null);
  const overlayMouseDownStartedOutsideRef = useRef(false);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading, onClose]);

  useEffect(() => {
    document.documentElement.classList.add('is-lock');
    return () => document.documentElement.classList.remove('is-lock');
  }, []);

  if (!tag) return null;

  const handleOverlayMouseDown = (event) => {
    overlayMouseDownStartedOutsideRef.current = event.target === event.currentTarget;
  };

  const handleOverlayMouseUp = (event) => {
    const endedOutside = event.target === event.currentTarget;
    if (!loading && overlayMouseDownStartedOutsideRef.current && endedOutside) {
      onClose?.();
    }
    overlayMouseDownStartedOutsideRef.current = false;
  };

  return (
    <div
      className={styles.dialogOverlay}
      onMouseDown={handleOverlayMouseDown}
      onMouseUp={handleOverlayMouseUp}
    >
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cancel-tag-title"
        aria-describedby="cancel-tag-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.dialogClose}
          onClick={onClose}
          disabled={loading}
          aria-label="Закрыть"
        >
          ×
        </button>

        <div className={styles.dialogHeader}>
          <span className={styles.dialogEyebrow}>Модерация тега</span>
          <h2 id="cancel-tag-title">Отменить заявку?</h2>
        </div>

        <p id="cancel-tag-description" className={styles.dialogText}>
          Тег «{tag.name}» будет снят с модерации и перейдёт в отклонённые. После этого его можно будет отправить повторно.
        </p>

        {error && <div className={styles.dialogError}>{error}</div>}

        <div className={styles.dialogActions}>
          <button
            ref={cancelButtonRef}
            type="button"
            className={styles.dialogSecondary}
            onClick={onClose}
            disabled={loading}
          >
            Не отменять
          </button>
          <button
            type="button"
            className={styles.dialogDanger}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Отмена...' : 'Отменить заявку'}
          </button>
        </div>
      </div>
    </div>
  );
};

const EmployerTagsPage = () => {
  const { toast } = useToast();
  const filterOptions = [
    { value: 'ALL', label: 'Все' },
    { value: 'PENDING', label: 'На модерации' },
    { value: 'APPROVED', label: 'Одобренные' },
    { value: 'REJECTED', label: 'Отклонённые' },
  ];
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [error, setError] = useState(null);
  const [cancelTag, setCancelTag] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const loadTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filterStatus !== 'ALL' ? { status: filterStatus } : {};
      const data = await getEmployerTags(params);
      setTags(Array.isArray(data) ? data : []);
    } catch {
      setError('Не удалось загрузить теги');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const openCancelDialog = (tag) => {
    setCancelTag(tag);
    setCancelError(null);
  };

  const closeCancelDialog = () => {
    if (cancelLoading) return;
    setCancelTag(null);
    setCancelError(null);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTag || cancelLoading) return;

    setCancelLoading(true);
    setCancelError(null);
    try {
      await cancelEmployerTagModeration(cancelTag.id);
      setCancelTag(null);
      await loadTags();
      toast({
        title: 'Заявка отменена',
        description: 'Заявка на модерацию тега успешно отменена',
      });
    } catch (error) {
      const message = error?.message || 'Не удалось отменить заявку на модерацию';
      setCancelError(message);
      toast({
        title: 'Ошибка',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCreate = async (tagData) => {
    try {
      await createEmployerTag(tagData);
      setShowCreateForm(false);
      await loadTags();
      toast({
        title: 'Тег отправлен',
        description: 'Новый тег отправлен на модерацию',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error?.message || 'Не удалось создать тег',
        variant: 'destructive',
      });
    }
  };

  const openDetails = (tag) => setSelectedTag(tag);

  if (loading) return <div className={styles.loader}>Загрузка...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Мои теги</h1>
        <button className={styles.createBtn} onClick={() => setShowCreateForm(true)}>+ Предложить тег</button>
      </div>

      <div className={styles.filters}>
        <div className={styles.filtersField}>
          <label>Статус</label>
          <CustomSelect value={filterStatus} onChange={setFilterStatus} options={filterOptions} />
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Категория</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {tags.length === 0 ? (
              <tr><td colSpan="4" className={styles.empty}>Нет тегов</td></tr>
            ) : (
              tags.map(tag => (
                <tr key={tag.id}>
                  <td data-label="Название">{tag.name}</td>
                  <td data-label="Категория">{getTagCategoryLabel(tag.category)}</td>
                  <td data-label="Статус"><TagStatusBadge status={tag.moderationStatus} /></td>
                  <td data-label="Действия">
                    <div className={styles.actions}>
                      <button className={styles.detailBtn} onClick={() => openDetails(tag)}>Открыть карточку</button>
                      {tag.moderationStatus === 'PENDING' && (
                        <button className={styles.cancelBtn} onClick={() => openCancelDialog(tag)}>Отменить</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedTag && (
        <TagModerationDetails tag={selectedTag} onClose={() => setSelectedTag(null)} />
      )}

      {cancelTag && (
        <CancelTagModerationDialog
          tag={cancelTag}
          loading={cancelLoading}
          error={cancelError}
          onClose={closeCancelDialog}
          onConfirm={handleConfirmCancel}
        />
      )}

      {showCreateForm && (
        <CreateTagForm
          onCreate={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          isLoading={loading}
        />
      )}
    </div>
  );
};

export default EmployerTagsPage;
