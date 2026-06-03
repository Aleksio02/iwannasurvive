import React, { useEffect, useState } from 'react';
import { getCuratorTagModerationDetails } from '@/shared/api/curatorTag';
import TagModerationDetailsContent from './TagModerationDetailsContent.jsx';
import styles from './TagModerationDetails.module.scss';

const CuratorTagModerationDetails = ({ tagId, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(Boolean(tagId));
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCuratorTagModerationDetails(tagId);
        if (!ignore) setDetails(data);
      } catch (err) {
        if (!ignore) setError('Не удалось загрузить карточку тега');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    if (tagId) {
      fetchDetails();
    }

    return () => {
      ignore = true;
    };
  }, [tagId]);

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

  if (!tagId) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <TagModerationDetailsContent
          details={details}
          title="Проверка тега"
          loading={loading}
          error={error}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default CuratorTagModerationDetails;
