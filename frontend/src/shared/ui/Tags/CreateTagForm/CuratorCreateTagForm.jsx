import React, { useEffect, useRef, useState } from 'react';
import Input from '@/shared/ui/Input';
import Label from '@/shared/ui/Label';
import Button from '@/shared/ui/Button';
import CustomSelect from '@/shared/ui/CustomSelect';
import { TAG_CATEGORY_OPTIONS } from '@/shared/lib/utils/tagCategories';
import styles from './CreateTagForm.module.scss';

const CuratorCreateTagForm = ({ onCreate, onCancel, isLoading }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('TECH');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const overlayMouseDownStartedOutsideRef = useRef(false);
  const isBusy = isLoading || submitting;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    document.documentElement.classList.add('is-lock');
    return () => document.documentElement.classList.remove('is-lock');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBusy) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Введите название тега');
      return;
    }
    if (trimmedName.length > 100) {
      setError('Название тега не должно быть длиннее 100 символов');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onCreate({ name: trimmedName, category });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayMouseDown = (event) => {
    overlayMouseDownStartedOutsideRef.current = event.target === event.currentTarget;
  };

  const handleOverlayMouseUp = (event) => {
    const endedOutside = event.target === event.currentTarget;
    if (overlayMouseDownStartedOutsideRef.current && endedOutside) {
      onCancel?.();
    }
    overlayMouseDownStartedOutsideRef.current = false;
  };

  return (
      <div
        className={styles.overlay}
        onMouseDown={handleOverlayMouseDown}
        onMouseUp={handleOverlayMouseUp}
      >
        <div className={styles.formContainer} onMouseDown={(e) => e.stopPropagation()}>
          <h3>Создать тег</h3>
          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <Label>Название тега <span className="required-star">*</span></Label>
              <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например, JavaScript"
                  disabled={isBusy}
              />
            </div>
            <div className={styles.field}>
              <CustomSelect
                  label="Категория"
                  value={category}
                  onChange={setCategory}
                  options={TAG_CATEGORY_OPTIONS}
                  inModal={true}
                  disabled={isBusy}
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.actions}>
              <Button type="button" className="button--outline" onClick={onCancel} disabled={isBusy}>Отмена</Button>
              <Button type="submit" className="button--primary" disabled={isBusy}>
                {submitting ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </form>
        </div>
      </div>
  );
};

export default CuratorCreateTagForm;
