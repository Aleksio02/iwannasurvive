import React, { useEffect, useState } from 'react';
import { getEmployerTagModerationDetails } from '@/shared/api/employerTag';
import TagModerationDetailsContent from './TagModerationDetailsContent.jsx';
import Modal from '@/shared/ui/Modal';

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
      } catch {
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

  if (!tag) return null;

  return (
    <Modal isOpen={Boolean(tag)} title="Информация о теге" onClose={onClose}>
        <TagModerationDetailsContent
          details={details}
          loading={loading}
          error={error}
          fallbackTag={tag}
        />
    </Modal>
  );
};

export default TagModerationDetails;
