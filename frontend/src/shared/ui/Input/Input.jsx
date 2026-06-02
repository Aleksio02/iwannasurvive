import { forwardRef } from 'react'
import './Input.scss'

const Input = forwardRef(function Input({
                   id,
                   type = 'text',
                   value,
                   onChange,
                   placeholder = '',
                   required = false,
                   className = '',
                   name,
                   ...rest
               }, ref) {
    return (
        <input
            ref={ref}
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className={`input ${className}`.trim()}
            {...rest}
        />
    )
})

export default Input
