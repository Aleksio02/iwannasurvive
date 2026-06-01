import { useEffect, useRef } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import './ChatImageLightbox.scss'

function ChatImageLightbox({
                               alt,
                               error,
                               imageUrl,
                               isLoading,
                               onClose,
                               onImageError,
                               onImageLoad,
                           }) {
    const closeButtonRef = useRef(null)

    useEffect(() => {
        const previousOverflow = document.body.style.overflow
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose()
        }

        document.body.style.overflow = 'hidden'
        document.addEventListener('keydown', handleKeyDown)
        closeButtonRef.current?.focus()

        return () => {
            document.body.style.overflow = previousOverflow
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [onClose])

    return (
        <div
            className="chat-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`Просмотр изображения ${alt}`}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <button
                ref={closeButtonRef}
                type="button"
                className="chat-lightbox__close"
                aria-label="Закрыть изображение"
                title="Закрыть"
                onClick={onClose}
            >
                <X size={24} aria-hidden="true" />
            </button>
            <div className="chat-lightbox__content">
                {isLoading && (
                    <div className="chat-lightbox__loader" aria-label="Загрузка изображения">
                        <LoaderCircle className="chats__spinner" size={34} aria-hidden="true" />
                    </div>
                )}
                {error ? (
                    <div className="chat-lightbox__error">
                        <p>{error}</p>
                        <button type="button" onClick={onClose}>Закрыть</button>
                    </div>
                ) : imageUrl ? (
                    <img
                        className={isLoading ? 'is-loading' : ''}
                        src={imageUrl}
                        alt={alt}
                        onLoad={onImageLoad}
                        onError={onImageError}
                    />
                ) : null}
            </div>
        </div>
    )
}

export default ChatImageLightbox
