import { forwardRef } from 'react'
import './Button.scss'

const Button = forwardRef(function Button({
                    type = 'button',
                    children,
                    className = '',
                    disabled = false,
                    onClick,
                    ...rest
                }, ref) {
    return (
        <button
            ref={ref}
            type={type}
            className={`button ${className}`.trim()}
            disabled={disabled}
            onClick={onClick}
            {...rest}
        >
            {children}
        </button>
    )
})

export default Button
