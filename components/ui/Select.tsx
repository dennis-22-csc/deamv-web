import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ 
    value,
    onValueChange,
    options,
    placeholder = "Select an option",
    variant = 'outlined',
    size = 'md',
    label,
    error,
    helperText,
    fullWidth = true,
    disabled = false,
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value || '');
    const selectRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === selectedValue);

    useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option: SelectOption) => {
      if (option.disabled) return;
      
      setSelectedValue(option.value);
      onValueChange?.(option.value);
      setIsOpen(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          setIsOpen(!isOpen);
          break;
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            // Navigate options (simplified)
            const currentIndex = options.findIndex(opt => opt.value === selectedValue);
            const nextIndex = Math.min(currentIndex + 1, options.length - 1);
            if (options[nextIndex] && !options[nextIndex].disabled) {
              handleSelect(options[nextIndex]);
            }
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            // Navigate options (simplified)
            const currentIndex = options.findIndex(opt => opt.value === selectedValue);
            const prevIndex = Math.max(currentIndex - 1, 0);
            if (options[prevIndex] && !options[prevIndex].disabled) {
              handleSelect(options[prevIndex]);
            }
          }
          break;
      }
    };

    const baseStyles = 'transition-all duration-200 outline-none rounded-lg font-normal text-left flex items-center justify-between cursor-pointer';
    
    const variantStyles = {
      default: 'border-0 bg-gray-50 focus:ring-2 focus:ring-blue-500',
      outlined: 'border border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
      filled: 'border-b-2 border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
    };

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-sm',
      lg: 'px-4 py-3 text-base',
    };

    const errorStyles = error 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
      : '';

    const disabledStyles = disabled 
      ? 'opacity-50 cursor-not-allowed bg-gray-100' 
      : '';

    const widthStyle = fullWidth ? 'w-full' : '';

    const triggerClasses = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      errorStyles,
      disabledStyles,
      widthStyle,
    ].filter(Boolean).join(' ');

    const iconSizes = {
      sm: 'h-4 w-4',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    };

    const dropdownClasses = `
      absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none
      ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
      transition-all duration-200 origin-top
    `;

    return (
      <div className={fullWidth ? 'w-full' : 'inline-block'}>
        {/* Label */}
        {label && (
          <label className={`block text-sm font-medium mb-2 ${
            error ? 'text-red-700' : 'text-gray-700'
          }`}>
            {label}
          </label>
        )}

        {/* Select Container */}
        <div ref={selectRef} className="relative">
          {/* Trigger Button */}
          <button
            ref={ref}
            type="button"
            className={triggerClasses}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={label ? undefined : 'select-label'}
          >
            <span className={`truncate ${!selectedOption ? 'text-gray-500' : 'text-gray-900'}`}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            
            {isOpen ? (
              <ChevronUp className={`${iconSizes[size]} text-gray-400 flex-shrink-0`} />
            ) : (
              <ChevronDown className={`${iconSizes[size]} text-gray-400 flex-shrink-0`} />
            )}
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className={dropdownClasses}>
              <div className="py-1" role="listbox">
                {options.map((option) => (
                  <div
                    key={option.value}
                    className={`
                      relative cursor-pointer select-none py-2 pl-3 pr-9
                      ${option.value === selectedValue 
                        ? 'bg-blue-50 text-blue-900' 
                        : 'text-gray-900 hover:bg-gray-50'
                      }
                      ${option.disabled 
                        ? 'opacity-50 cursor-not-allowed hover:bg-transparent' 
                        : ''
                      }
                      transition-colors duration-150
                    `}
                    onClick={() => handleSelect(option)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(option);
                      }
                    }}
                    role="option"
                    aria-selected={option.value === selectedValue}
                    tabIndex={0}
                  >
                    <span className="block truncate font-normal">
                      {option.label}
                    </span>
                    
                    {option.value === selectedValue && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                ))}
                
                {options.length === 0 && (
                  <div className="py-2 pl-3 pr-9 text-gray-500 text-sm">
                    No options available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Helper Text / Error Message */}
        {(helperText || error) && (
          <p className={`mt-2 text-sm ${
            error ? 'text-red-600' : 'text-gray-500'
          }`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// SelectLayout component for consistent styling
interface SelectLayoutProps {
  label?: string;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const SelectLayout = React.forwardRef<HTMLDivElement, SelectLayoutProps>(
  ({ 
    label, 
    error, 
    helperText, 
    children, 
    fullWidth = true,
    ...props 
  }, ref) => {
    return (
      <div 
        ref={ref}
        className={fullWidth ? 'w-full' : 'inline-block'}
        {...props}
      >
        {/* Label */}
        {label && (
          <label className={`block text-sm font-medium mb-2 ${
            error ? 'text-red-700' : 'text-gray-700'
          }`}>
            {label}
          </label>
        )}

        {/* Children (Select component) */}
        {children}

        {/* Helper Text / Error Message */}
        {(helperText || error) && (
          <p className={`mt-2 text-sm ${
            error ? 'text-red-600' : 'text-gray-500'
          }`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

SelectLayout.displayName = 'SelectLayout';

export { Select, SelectLayout };
export type { SelectOption };
