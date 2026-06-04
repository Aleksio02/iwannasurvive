import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Input from '../Input'
import Label from '../Label'
import './Autocomplete.scss'

function Autocomplete({
                          label,
                          required = false,
                          value,
                          onChange,
                          suggestions,
                          isOpen,
                          onOpenChange,
                          activeIndex,
                          onActiveIndexChange,
                          inputRef,
                          placeholder,
                          error,
                          onSelect,
                          getSuggestionValue = (item) => typeof item === 'string' ? item : item.name,
                          getSuggestionKey = (item) => typeof item === 'string' ? item : item.id,
                      }) {
    const wrapperRef = useRef(null)
    const menuRef = useRef(null)
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 })

    const updatePosition = useCallback(() => {
        if (!wrapperRef.current) return
        const rect = wrapperRef.current.getBoundingClientRect()
        setMenuPosition({
            top: rect.bottom + 6,
            left: rect.left,
            width: rect.width,
        })
    }, [])

    // Закрытие при клике вне
    useEffect(() => {
        const handleClickOutside = (event) => {
            const isInsideWrapper = wrapperRef.current?.contains(event.target)
            const isInsideMenu = menuRef.current?.contains(event.target)

            if (!isInsideWrapper && !isInsideMenu && isOpen) {
                onOpenChange(false)
                onActiveIndexChange(-1)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onOpenChange, onActiveIndexChange])

    // Позиционирование и закрытие при скролле
    useEffect(() => {
        if (!isOpen) return

        updatePosition()

        window.addEventListener('resize', updatePosition)

        const handleScroll = (e) => {
            // Не закрываем, если скролл внутри меню
            if (menuRef.current && menuRef.current.contains(e.target)) {
                return
            }
            onOpenChange(false)
            onActiveIndexChange(-1)
        }
        window.addEventListener('scroll', handleScroll, true)

        return () => {
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', handleScroll, true)
        }
    }, [isOpen, updatePosition, onOpenChange, onActiveIndexChange])

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            if (!isOpen && suggestions.length > 0) {
                onOpenChange(true)
            }
            if (suggestions.length > 0) {
                const newIndex = activeIndex + 1
                if (newIndex < suggestions.length) {
                    onActiveIndexChange(newIndex)
                } else {
                    onActiveIndexChange(0)
                }
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            if (!isOpen && suggestions.length > 0) {
                onOpenChange(true)
            }
            if (suggestions.length > 0) {
                const newIndex = activeIndex - 1
                if (newIndex >= 0) {
                    onActiveIndexChange(newIndex)
                } else {
                    onActiveIndexChange(suggestions.length - 1)
                }
            }
        } else if (event.key === 'Enter' && isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
            event.preventDefault()
            onSelect(suggestions[activeIndex])
            onOpenChange(false)
            onActiveIndexChange(-1)
        } else if (event.key === 'Escape') {
            onOpenChange(false)
            onActiveIndexChange(-1)
        }
    }

    const uniqueSuggestions = useMemo(() => {
        const seen = new Set()
        return suggestions.filter(item => {
            const name = getSuggestionValue(item)
            if (seen.has(name)) return false
            seen.add(name)
            return true
        })
    }, [suggestions, getSuggestionValue])

    const menu = isOpen && uniqueSuggestions.length > 0 && createPortal(
        <div
            ref={menuRef}
            className="autocomplete__list"
            role="listbox"
            style={{
                position: 'fixed',
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                width: `${menuPosition.width}px`,
                zIndex: 999999,
            }}
        >
            {uniqueSuggestions.map((item, index) => {
                const displayName = getSuggestionValue(item)
                return (
                    <button
                        key={getSuggestionKey(item)}
                        type="button"
                        className={`autocomplete__item ${activeIndex === index ? 'is-active' : ''}`}
                        onMouseEnter={() => onActiveIndexChange(index)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            onSelect(item)
                            onOpenChange(false)
                            onActiveIndexChange(-1)
                        }}
                        title={displayName}
                    >
                        {displayName}
                    </button>
                )
            })}
        </div>,
        document.body
    )

    return (
        <div className="autocomplete" ref={wrapperRef}>
            {label && (
                <Label>
                    {label}
                    {required && <span className="required-star"> *</span>}
                </Label>
            )}
            <div className="autocomplete__wrapper">
                <Input
                    ref={inputRef}
                    value={value}
                    onFocus={() => {
                        if (uniqueSuggestions.length > 0 && !isOpen) {
                            updatePosition()
                            onOpenChange(true)
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => {
                        onChange(e.target.value)
                        onOpenChange(true)
                        onActiveIndexChange(-1)
                    }}
                    placeholder={placeholder}
                />
            </div>
            {error && <p className="field-error">{error}</p>}
            {menu}
        </div>
    )
}

export default Autocomplete