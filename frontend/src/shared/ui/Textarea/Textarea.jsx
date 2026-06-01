import { forwardRef } from 'react'
import './Textarea.scss'

const Textarea = forwardRef(function Textarea({
                      id,
                      value,
                      onChange,
                      placeholder = '',
                      rows = 3,
                      required = false,
                      className = '',
                      ...rest
                  }, ref) {
    return (
        <textarea
            ref={ref}
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            required={required}
            className={`textarea ${className}`.trim()}
            {...rest}
        />
    )
})

export default Textarea
