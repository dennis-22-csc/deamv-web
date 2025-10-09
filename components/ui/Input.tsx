import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'outlined' | 'filled';
  inputSize?: 'sm' | 'md' | 'lg';
  label?: string;
  error?: string;
  helperText?: string;
  startIcon?: LucideIcon | React.ReactNode;
  endIcon?: LucideIcon | React.ReactNode;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    variant = 'outlined',
    inputSize = 'md',
    label,
    error,
    helperText,
    startIcon: StartIcon,
    endIcon: EndIcon,
    fullWidth = true,
    className = '',
    id,
    ...props 
  }, ref) => {
    const size = inputSize;

    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    const baseStyles = 'transition-all duration-200 outline-none rounded-lg font-normal focus:ring-2';
    
    const variantStyles = {
      default: 'border-0 bg-gray-50 focus:bg-white focus:ring-blue-500',
      outlined: 'border border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500',
      filled: 'border-b-2 border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500',
    };

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-sm',
      lg: 'px-4 py-4 text-base',
    };

    const iconPaddingStyles = {
      sm: {
        left: 'pl-9',
        right: 'pr-9',
        both: 'px-9'
      },
      md: {
        left: 'pl-10',
        right: 'pr-10',
        both: 'px-10'
      },
      lg: {
        left: 'pl-11',
        right: 'pr-11',
        both: 'px-11'
      }
    };

    let paddingStyle = sizeStyles[size];
    if (StartIcon && EndIcon) {
      paddingStyle = `${iconPaddingStyles[size].both} ${sizeStyles[size].split(' ')[1]}`;
    } else if (StartIcon) {
      paddingStyle = `${iconPaddingStyles[size].left} ${sizeStyles[size].split(' ')[1]}`;
    } else if (EndIcon) {
      paddingStyle = `${iconPaddingStyles[size].right} ${sizeStyles[size].split(' ')[1]}`;
    }

    const errorStyles = error 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
      : '';

    const disabledStyles = props.disabled 
      ? 'opacity-50 cursor-not-allowed bg-gray-100' 
      : '';

    const widthStyle = fullWidth ? 'w-full' : '';

    const inputClasses = [
      baseStyles,
      variantStyles[variant],
      paddingStyle,
      errorStyles,
      disabledStyles,
      widthStyle,
      className
    ].filter(Boolean).join(' ');

    const iconSizes = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-5 w-5',
    };

    const iconColors = error ? 'text-red-500' : 'text-gray-400';

    // Helper function to render icons
    const renderIcon = (icon: LucideIcon | React.ReactNode) => {
      if (!icon) return null;
      
      // If it's a LucideIcon component (a function/class)
      if (typeof icon === 'function') {
        const IconComponent = icon as LucideIcon;
        return <IconComponent className={`${iconSizes[size]} ${iconColors}`} />;
      }
      
      // If it's a React node (JSX element)
      if (React.isValidElement(icon)) {
        // Assert the type of the element to allow access to props.className
        const iconElement = icon as React.ReactElement<{ className?: string }>;

        return React.cloneElement(iconElement, {
          className: `${iconElement.props.className || ''} ${iconSizes[size]} ${iconColors}`
        });
      }

      // If it's some other valid ReactNode
      return icon;
    };

    return (
      <div className={fullWidth ? 'w-full' : 'inline-block'}>
        {/* Label */}
        {label && (
          <label 
            htmlFor={inputId}
            className={`block text-sm font-medium mb-2 ${
              error ? 'text-red-700' : 'text-gray-700'
            }`}
          >
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Start Icon */}
          {StartIcon && (
            <div className={`absolute inset-y-0 left-0 flex items-center ${
              size === 'sm' ? 'pl-3' : 'pl-3'
            }`}>
              {renderIcon(StartIcon)}
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            {...props}
          />

          {/* End Icon */}
          {EndIcon && (
            <div className={`absolute inset-y-0 right-0 flex items-center ${
              size === 'sm' ? 'pr-3' : 'pr-3'
            }`}>
              {renderIcon(EndIcon)}
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

Input.displayName = 'Input';

// TextInputLayout component to match Android's TextInputLayout
interface TextInputLayoutProps {
  label?: string;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const TextInputLayout = React.forwardRef<HTMLDivElement, TextInputLayoutProps>(
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

        {/* Children (Input component) */}
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

TextInputLayout.displayName = 'TextInputLayout';

export default Input;
export { TextInputLayout };
