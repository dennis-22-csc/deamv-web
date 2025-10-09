import React from 'react';

interface ProgressProps {
  value?: number; // 0 to 100
  max?: number; // Maximum value (default: 100)
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  valuePosition?: 'left' | 'right' | 'top' | 'bottom' | 'inside';
  label?: string;
  indeterminate?: boolean;
  className?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    value = 0,
    max = 100,
    variant = 'primary',
    size = 'md',
    showValue = false,
    valuePosition = 'right',
    label,
    indeterminate = false,
    className = '',
  }, ref) => {
    // Calculate percentage
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const baseStyles = 'overflow-hidden bg-gray-200 rounded-full';
    
    const sizeStyles = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    };

    const variantStyles = {
      default: 'bg-gray-600',
      primary: 'bg-blue-600',
      success: 'bg-green-600',
      warning: 'bg-yellow-500',
      error: 'bg-red-600',
    };

    const containerClasses = [
      'flex items-center gap-3',
      valuePosition === 'top' || valuePosition === 'bottom' ? 'flex-col' : 'flex-row',
      valuePosition === 'top' || valuePosition === 'left' ? 'justify-start' : 'justify-between',
      className
    ].filter(Boolean).join(' ');

    const progressBarClasses = [
      baseStyles,
      sizeStyles[size],
      'w-full flex-1'
    ].filter(Boolean).join(' ');

    const progressFillClasses = [
      'h-full rounded-full transition-all duration-300 ease-out',
      indeterminate ? 'animate-pulse' : '',
      variantStyles[variant]
    ].filter(Boolean).join(' ');

    const valueTextClasses = `
      text-sm font-medium min-w-12 text-right
      ${variant === 'primary' ? 'text-blue-700' : ''}
      ${variant === 'success' ? 'text-green-700' : ''}
      ${variant === 'warning' ? 'text-yellow-700' : ''}
      ${variant === 'error' ? 'text-red-700' : ''}
      ${variant === 'default' ? 'text-gray-700' : ''}
    `;

    const labelClasses = 'text-sm font-medium text-gray-700';

    // Value display component
    const ValueDisplay = () => (
      <span className={valueTextClasses}>
        {indeterminate ? '—' : `${Math.round(percentage)}%`}
      </span>
    );

    // Progress bar with optional inside value
    const ProgressBarWithValue = () => (
      <div className={progressBarClasses}>
        <div
          className={progressFillClasses}
          style={indeterminate ? {} : { width: `${percentage}%` }}
        >
          {valuePosition === 'inside' && showValue && !indeterminate && (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs font-medium text-white px-2 truncate">
                {Math.round(percentage)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );

    // Render based on value position
    const renderContent = () => {
      if (!showValue) {
        return <ProgressBarWithValue />;
      }

      switch (valuePosition) {
        case 'top':
          return (
            <>
              <div className="flex justify-between w-full items-center">
                {label && <span className={labelClasses}>{label}</span>}
                <ValueDisplay />
              </div>
              <ProgressBarWithValue />
            </>
          );
        
        case 'bottom':
          return (
            <>
              <div className="flex justify-between w-full items-center">
                {label && <span className={labelClasses}>{label}</span>}
              </div>
              <ProgressBarWithValue />
              <div className="flex justify-between w-full items-center">
                <span className="text-xs text-gray-500">Progress</span>
                <ValueDisplay />
              </div>
            </>
          );
        
        case 'left':
          return (
            <>
              <ValueDisplay />
              <ProgressBarWithValue />
            </>
          );
        
        case 'inside':
          return <ProgressBarWithValue />;
        
        case 'right':
        default:
          return (
            <>
              <ProgressBarWithValue />
              <ValueDisplay />
            </>
          );
      }
    };

    return (
      <div ref={ref} className={containerClasses}>
        {label && valuePosition !== 'top' && valuePosition !== 'bottom' && valuePosition !== 'inside' && (
          <span className={labelClasses}>{label}</span>
        )}
        
        {renderContent()}
      </div>
    );
  }
);

Progress.displayName = 'Progress';

// Circular Progress component (for indeterminate states)
interface CircularProgressProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ 
    size = 'md',
    variant = 'primary',
    className = '',
  }, ref) => {
    const sizeStyles = {
      sm: 'h-4 w-4',
      md: 'h-8 w-8',
      lg: 'h-12 w-12',
    };

    const variantStyles = {
      default: 'text-gray-600',
      primary: 'text-blue-600',
      success: 'text-green-600',
      warning: 'text-yellow-500',
      error: 'text-red-600',
    };

    const classes = [
      'animate-spin',
      sizeStyles[size],
      variantStyles[variant],
      className
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classes}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeOpacity="0.25" 
            strokeWidth="4" 
          />
          <path 
            d="M12 2C13.3132 2 14.6136 2.25866 15.8268 2.7612C17.0401 3.26375 18.1425 4.00035 19.0711 4.92893C19.9997 5.85752 20.7362 6.95991 21.2388 8.17317C21.7413 9.38642 22 10.6868 22 12" 
            stroke="currentColor" 
            strokeWidth="4" 
            strokeLinecap="round" 
          />
        </svg>
      </div>
    );
  }
);

CircularProgress.displayName = 'CircularProgress';

// Progress Indicator with text (like Android's progress text)
interface ProgressIndicatorProps {
  current: number;
  total: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  showProgressBar?: boolean;
  className?: string;
}

const ProgressIndicator = React.forwardRef<HTMLDivElement, ProgressIndicatorProps>(
  ({ 
    current,
    total,
    variant = 'primary',
    showProgressBar = true,
    className = '',
  }, ref) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    
    const textClasses = `
      text-sm font-bold min-w-12
      ${variant === 'primary' ? 'text-blue-700' : ''}
      ${variant === 'success' ? 'text-green-700' : ''}
      ${variant === 'warning' ? 'text-yellow-700' : ''}
      ${variant === 'error' ? 'text-red-700' : ''}
      ${variant === 'default' ? 'text-gray-700' : ''}
    `;

    return (
      <div ref={ref} className={`flex items-center gap-3 ${className}`}>
        <span className={textClasses}>
          {current}/{total}
        </span>
        
        {showProgressBar && (
          <Progress
            value={percentage}
            variant={variant}
            size="md"
            className="flex-1"
          />
        )}
      </div>
    );
  }
);

ProgressIndicator.displayName = 'ProgressIndicator';

export { Progress, CircularProgress, ProgressIndicator };
