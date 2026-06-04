import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Label from '../Label'
import './CustomSelect.scss'

function normalizeSelectValue(value) {
    if (value === null || value === undefined) return ''
    return String(value)
}

function CustomSelect({
                          label,
                          value,
                          onChange,
                          options = [],
                          placeholder = 'Выберите',
                          error,
                          required = false,
                          inModal = false,
                          disabled = false,
                      }) {
    const [isOpen, setIsOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [menuPosition, setMenuPosition] = useState(null)
    const [isMobile, setIsMobile] = useState(false)
    const [mobileMenuStyle, setMobileMenuStyle] = useState(null)

    const rootRef = useRef(null)
    const buttonRef = useRef(null)
    const menuRef = useRef(null)

    const normalizedValue = normalizeSelectValue(value)
    const selected = options.find((o) => normalizeSelectValue(o.value) === normalizedValue)
    const safeOptions = Array.isArray(options) ? options : []

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        const onDocClick = (e) => {
            const insideRoot = rootRef.current?.contains(e.target)
            const insideMenu = menuRef.current?.contains(e.target)
            if (!insideRoot && !insideMenu) setIsOpen(false)
        }

        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

    useEffect(() => {
        if (!isOpen || inModal) return

        const updatePosition = () => {
            if (!buttonRef.current) return
            const rect = buttonRef.current.getBoundingClientRect()
            const viewportHeight = window.innerHeight
            const menuHeight = Math.min(320, viewportHeight - rect.bottom - 20)

            let top = rect.bottom + 6

            if (top + menuHeight > viewportHeight - 10) {
                top = viewportHeight - menuHeight - 10
            }

            if (top < 10) top = 10

            setMenuPosition({
                top,
                left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
                width: rect.width,
            })
        }

        updatePosition()
        window.addEventListener('resize', updatePosition)

        const handleScroll = (e) => {
            if (menuRef.current && menuRef.current.contains(e.target)) {
                return
            }
            setIsOpen(false)
        }
        window.addEventListener('scroll', handleScroll, true)

        return () => {
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', handleScroll, true)
        }
    }, [inModal, isOpen])

    useEffect(() => {
        if (!isOpen || !inModal || !isMobile) {
            setMobileMenuStyle(null)
            return
        }

        const updateMobileMenuPosition = () => {
            if (!buttonRef.current) return

            const buttonRect = buttonRef.current.getBoundingClientRect()
            const viewportHeight = window.innerHeight
            const margin = 16
            const topSpacing = 8

            const spaceBelow = viewportHeight - buttonRect.bottom - margin
            let maxMenuHeight = spaceBelow - topSpacing

            if (maxMenuHeight < 100) {
                maxMenuHeight = 100
            }

            const top = buttonRect.bottom + topSpacing

            setMobileMenuStyle({
                top: top,
                left: margin,
                right: margin,
                maxHeight: maxMenuHeight,
            })
        }

        updateMobileMenuPosition()
        window.addEventListener('resize', updateMobileMenuPosition)

        const handleScroll = (e) => {
            if (menuRef.current && menuRef.current.contains(e.target)) {
                return
            }
            setIsOpen(false)
        }
        window.addEventListener('scroll', handleScroll, true)

        return () => {
            window.removeEventListener('resize', updateMobileMenuPosition)
            window.removeEventListener('scroll', handleScroll, true)
        }
    }, [isOpen, inModal, isMobile])

    useEffect(() => {
        if (!isOpen) {
            setMenuPosition(null)
            setMobileMenuStyle(null)
            setActiveIndex(-1)
        }
    }, [isOpen])

    const handleKeyDown = (event) => {
        if (!safeOptions.length) return
        if (disabled) return

        if (event.key === 'ArrowDown') {
            event.preventDefault()
            if (!isOpen) setIsOpen(true)
            setActiveIndex((prev) => (prev + 1) % safeOptions.length)
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            if (!isOpen) setIsOpen(true)
            setActiveIndex((prev) => (prev <= 0 ? safeOptions.length - 1 : prev - 1))
        } else if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
            event.preventDefault()
            onChange(safeOptions[activeIndex].value)
            setIsOpen(false)
        } else if (event.key === 'Escape') {
            setIsOpen(false)
        }
    }

    const displayText = selected?.label || placeholder
    const truncatedText = displayText.length > 40 ? displayText.slice(0, 37) + '...' : displayText

    const menuItems = safeOptions.map((option, idx) => (
        <button
            key={`${option.value}-${idx}`}
            type="button"
            className={`custom-select__item ${
                normalizedValue === normalizeSelectValue(option.value) ? 'is-selected' : ''
            } ${idx === activeIndex ? 'is-active' : ''}`}
            onMouseEnter={() => setActiveIndex(idx)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
                if (disabled) return
                onChange(option.value)
                setIsOpen(false)
            }}
            title={option.label}
        >
            {option.label}
        </button>
    ))

    const inlineMenu = inModal && isOpen ? (
        <div
            ref={menuRef}
            className={`custom-select__menu custom-select__menu--inline ${isMobile ? 'custom-select__menu--inline-mobile' : ''}`}
            role="listbox"
            style={isMobile && mobileMenuStyle ? {
                position: 'fixed',
                top: `${mobileMenuStyle.top}px`,
                left: `${mobileMenuStyle.left}px`,
                right: `${mobileMenuStyle.right}px`,
                maxHeight: `${mobileMenuStyle.maxHeight}px`,
                width: 'auto',
            } : undefined}
        >
            {menuItems.length > 0 ? menuItems : (
                <div className="custom-select__empty">Нет вариантов</div>
            )}
        </div>
    ) : null

    const portalMenu = !inModal && isOpen && menuPosition
        ? createPortal(
            <div
                ref={menuRef}
                className="custom-select__menu custom-select__menu--portal"
                role="listbox"
                style={{
                    position: 'fixed',
                    top: `${menuPosition.top}px`,
                    left: `${menuPosition.left}px`,
                    width: `${menuPosition.width}px`,
                    maxHeight: `${Math.min(320, window.innerHeight - menuPosition.top - 20)}px`,
                    overflowY: 'auto',
                }}
            >
                {menuItems.length > 0 ? menuItems : (
                    <div className="custom-select__empty">Нет вариантов</div>
                )}
            </div>,
            document.body
        )
        : null

    return (
        <div
            className={`custom-select ${inModal ? 'custom-select--modal' : ''} ${isOpen ? 'is-open' : ''} ${disabled ? 'select-disabled' : ''}`.trim()}
            ref={rootRef}
        >
            {label && (
                <Label>
                    {label}
                    {required && <span className="required-star"> *</span>}
                </Label>
            )}

            <div className="custom-select__wrapper">
                <button
                    ref={buttonRef}
                    type="button"
                    className={`custom-select__button ${error ? 'is-error' : ''}`}
                    onClick={() => {
                        if (!disabled) setIsOpen((v) => !v)
                    }}
                    onKeyDown={handleKeyDown}
                    aria-expanded={isOpen}
                    title={displayText}
                    disabled={disabled || safeOptions.length === 0}
                >
                    <span className="custom-select__text">{truncatedText}</span>
                    <span className={`custom-select__arrow ${isOpen ? 'is-open' : ''}`}>▾</span>
                </button>

                {inlineMenu}
            </div>

            {portalMenu}
            {error && <p className="field-error">{error}</p>}
        </div>
    )
}

export default CustomSelect