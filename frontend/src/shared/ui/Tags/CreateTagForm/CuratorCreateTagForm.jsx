import React, { useId, useState } from 'react';
import Input from '@/shared/ui/Input';
import Label from '@/shared/ui/Label';
import Button from '@/shared/ui/Button';
import CustomSelect from '@/shared/ui/CustomSelect';
import Modal from '@/shared/ui/Modal';
import { TAG_CATEGORY_OPTIONS } from '@/shared/lib/utils/tagCategories';
import styles from './CreateTagForm.module.scss';

const CuratorCreateTagForm = ({ onCreate, onCancel, isLoading }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('TECH');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const formId = useId();
  const isBusy = isLoading || submitting;

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

  return (
      <Modal
        isOpen={true}
        title="Создать тег"
        onClose={onCancel}
        closeDisabled={isBusy}
        closeOnBackdrop={!isBusy}
        closeOnEscape={!isBusy}
        size="sm"
        footer={(
          <>
            <Button type="button" className="button--outline" onClick={onCancel} disabled={isBusy}>Отмена</Button>
            <Button type="submit" className="button--primary" disabled={isBusy} form={formId}>
              {submitting ? 'Создание...' : 'Создать'}
            </Button>
          </>
        )}
      >
          <form id={formId} className={styles.form} onSubmit={handleSubmit}>
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
          </form>
      </Modal>
  );
};

export default CuratorCreateTagForm;
