import React, { useEffect, useState } from 'react';
import { getCuratorTagModerationDetails } from '@/shared/api/curatorTag';
import TagModerationDetailsContent from './TagModerationDetailsContent.jsx';
import Modal from '@/shared/ui/Modal';

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
      } catch {
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

  if (!tagId) return null;

  return (
    <Modal isOpen={Boolean(tagId)} title="Проверка тега" onClose={onClose}>
        <TagModerationDetailsContent
          details={details}
          loading={loading}
          error={error}
        />
    </Modal>
  );
};

export default CuratorTagModerationDetails;
