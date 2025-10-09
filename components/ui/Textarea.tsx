import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  error?: string;
  helperText?: string;
  startIcon?: LucideIcon;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  rows?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    variant = 'outlined',
    size = 'md',
    label,
    error,
    helperText,
    startIcon: StartIcon,
    fullWidth = true,
    resize = 'vertical',
    rows = 4,
    className = '',
    id,
    ...props 
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    
    const baseStyles = 'transition-all duration-200 outline-none rounded-lg font-normal focus:ring-2 font-mono';
    
    const variantStyles = {
      default: 'border-0 bg-gray-50 focus:bg-white focus:ring-blue-500',
      outlined: 'border border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500',
      filled: 'border-b-2 border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-blue-500',
    };

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-sm',
      lg: 'px-4 py-3 text-base',
    };

    const resizeStyles = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    const iconPaddingStyles = {
      sm: {
        withIcon: 'pl-9',
        withoutIcon: 'pl-3'
      },
      md: {
        withIcon: 'pl-10',
        withoutIcon: 'pl-4'
      },
      lg: {
        withIcon: 'pl-11',
        withoutIcon: 'pl-4'
      }
    };

    // Determine padding based on icons
    const paddingStyle = StartIcon 
      ? `${iconPaddingStyles[size].withIcon} ${sizeStyles[size].split(' ')[1]}`
      : `${iconPaddingStyles[size].withoutIcon} ${sizeStyles[size].split(' ')[1]}`;

    const errorStyles = error 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
      : '';

    const disabledStyles = props.disabled 
      ? 'opacity-50 cursor-not-allowed bg-gray-100' 
      : '';

    const widthStyle = fullWidth ? 'w-full' : '';

    const textareaClasses = [
      baseStyles,
      variantStyles[variant],
      paddingStyle,
      resizeStyles[resize],
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

    return (
      <div className={fullWidth ? 'w-full' : 'inline-block'}>
        {/* Label */}
        {label && (
          <label 
            htmlFor={textareaId}
            className={`block text-sm font-medium mb-2 ${
              error ? 'text-red-700' : 'text-gray-700'
            }`}
          >
            {label}
          </label>
        )}

        {/* Textarea Container */}
        <div className="relative">
          {/* Start Icon */}
          {StartIcon && (
            <div className={`absolute top-3 left-0 flex items-start ${
              size === 'sm' ? 'pl-3' : 'pl-3'
            }`}>
              <StartIcon className={`${iconSizes[size]} ${iconColors}`} />
            </div>
          )}

          {/* Textarea Field */}
          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            className={textareaClasses}
            {...props}
          />

          {/* Character Count (optional) */}
          {props.maxLength && (
            <div className="absolute bottom-2 right-2">
              <span className={`text-xs ${
                (props.value?.toString().length || 0) > (props.maxLength * 0.9) 
                  ? 'text-red-500' 
                  : 'text-gray-400'
              }`}>
                {props.value?.toString().length || 0}/{props.maxLength}
              </span>
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

Textarea.displayName = 'Textarea';

// TextareaLayout component to match Android's TextInputLayout for multi-line
interface TextareaLayoutProps {
  label?: string;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const TextareaLayout = React.forwardRef<HTMLDivElement, TextareaLayoutProps>(
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

        {/* Children (Textarea component) */}
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

TextareaLayout.displayName = 'TextareaLayout';

export { Textarea, TextareaLayout };
