import React, { useEffect, useState } from 'react';
import { getEmployerTagModerationDetails } from '@/shared/api/employerTag';
import TagModerationDetailsContent from './TagModerationDetailsContent.jsx';
import styles from './TagModerationDetails.module.scss';

const TagModerationDetails = ({ tag, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(Boolean(tag?.id));
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEmployerTagModerationDetails(tag.id);
        if (!ignore) setDetails(data);
      } catch (err) {
        if (!ignore) setError('Не удалось загрузить карточку тега');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    if (tag?.id) {
      fetchDetails();
    }

    return () => {
      ignore = true;
    };
  }, [tag?.id]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.documentElement.classList.add('is-lock');
    return () => document.documentElement.classList.remove('is-lock');
  }, []);

  if (!tag) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <TagModerationDetailsContent
          details={details}
          title="Информация о теге"
          loading={loading}
          error={error}
          onClose={onClose}
          fallbackTag={tag}
        />
      </div>
    </div>
  );
};

export default TagModerationDetails;
