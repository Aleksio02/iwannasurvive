import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import './Modal.scss'

function Modal({
                   isOpen,
                   title,
                   subtitle,
                   children,
                   footer,
                   onClose,
                   closeDisabled = false,
                   closeOnBackdrop = true,
                   closeOnEscape = true,
                   role = 'dialog',
                   className = '',
                   dialogClassName = '',
                   bodyClassName = '',
                   footerClassName = '',
                   size = 'md',
                   ariaLabel,
                   ariaDescribedBy,
               }) {
    const titleId = useId()
    const subtitleId = useId()
    const dialogRef = useRef(null)
    const lastFocusedRef = useRef(null)
    const overlayMouseDownStartedOutsideRef = useRef(false)
    const onCloseRef = useRef(onClose)
    const closeDisabledRef = useRef(closeDisabled)
    const closeOnEscapeRef = useRef(closeOnEscape)

    const canClose = typeof onClose === 'function' && !closeDisabled
    const descriptionId = ariaDescribedBy || (subtitle ? subtitleId : undefined)

    useEffect(() => {
        onCloseRef.current = onClose
        closeDisabledRef.current = closeDisabled
        closeOnEscapeRef.current = closeOnEscape
    })

    useEffect(() => {
        if (!isOpen) return undefined

        lastFocusedRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null
        document.documentElement.classList.add('is-lock')

        const focusTimer = window.setTimeout(() => {
            const focusTarget =
                dialogRef.current?.querySelector('[data-modal-initial-focus]') ||
                dialogRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ||
                dialogRef.current

            focusTarget?.focus?.()
        }, 0)

        const handleKeyDown = (event) => {
            if (
                event.key !== 'Escape' ||
                !closeOnEscapeRef.current ||
                closeDisabledRef.current ||
                typeof onCloseRef.current !== 'function'
            ) {
                return
            }

            event.preventDefault()
            onCloseRef.current('escape')
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => {
            window.clearTimeout(focusTimer)
            document.removeEventListener('keydown', handleKeyDown)
            document.documentElement.classList.remove('is-lock')
            lastFocusedRef.current?.focus?.()
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleOverlayMouseDown = (event) => {
        overlayMouseDownStartedOutsideRef.current = event.target === event.currentTarget
    }

    const handleOverlayMouseUp = (event) => {
        const endedOutside = event.target === event.currentTarget

        if (
            closeOnBackdrop &&
            canClose &&
            overlayMouseDownStartedOutsideRef.current &&
            endedOutside
        ) {
            onClose('backdrop')
        }

        overlayMouseDownStartedOutsideRef.current = false
    }

    return (
        <div
            className={`app-modal-overlay ${className}`.trim()}
            onMouseDown={handleOverlayMouseDown}
            onMouseUp={handleOverlayMouseUp}
        >
            <section
                ref={dialogRef}
                className={`app-modal app-modal--${size} ${dialogClassName}`.trim()}
                role={role}
                aria-modal="true"
                aria-label={ariaLabel}
                aria-labelledby={ariaLabel ? undefined : titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
            >
                {(title || onClose) && (
                    <header className="app-modal__header">
                        <div className="app-modal__heading">
                            {title && <h2 id={titleId} className="app-modal__title">{title}</h2>}
                            {subtitle && <p id={subtitleId} className="app-modal__subtitle">{subtitle}</p>}
                        </div>

                        {onClose && (
                            <button
                                type="button"
                                className="app-modal__close"
                                onClick={() => canClose && onClose('close-button')}
                                aria-label="Закрыть"
                                disabled={closeDisabled}
                                data-modal-initial-focus
                            >
                                <X size={20} aria-hidden="true" />
                            </button>
                        )}
                    </header>
                )}

                <div className={`app-modal__body ${bodyClassName}`.trim()}>
                    {children}
                </div>

                {footer && (
                    <footer className={`app-modal__footer ${footerClassName}`.trim()}>
                        {footer}
                    </footer>
                )}
            </section>
        </div>
    )
}

export default Modal
