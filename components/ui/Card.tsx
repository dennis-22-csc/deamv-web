import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    children, 
    variant = 'elevated',
    padding = 'md',
    hover = false,
    className = '',
    ...props 
  }, ref) => {
    const baseStyles = 'rounded-xl transition-all duration-200';
    
    const variantStyles = {
      elevated: 'bg-white border border-gray-100 shadow-sm',
      outlined: 'bg-white border border-gray-200',
      filled: 'bg-gray-50 border border-gray-100',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-3',
      md: 'p-6',
      lg: 'p-8',
    };

    const hoverStyles = hover 
      ? 'hover:shadow-md hover:-translate-y-0.5' 
      : '';

    const classes = [
      baseStyles,
      variantStyles[variant],
      paddingStyles[padding],
      hoverStyles,
      className
    ].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components for structured layouts
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'sm' | 'md' | 'lg';
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ 
    children, 
    spacing = 'md',
    className = '',
    ...props 
  }, ref) => {
    const spacingStyles = {
      sm: 'pb-2',
      md: 'pb-4',
      lg: 'pb-6',
    };

    const classes = [
      spacingStyles[spacing],
      className
    ].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ 
    children, 
    spacing = 'none',
    className = '',
    ...props 
  }, ref) => {
    const spacingStyles = {
      none: '',
      sm: 'space-y-2',
      md: 'space-y-4',
      lg: 'space-y-6',
    };

    const classes = [
      spacingStyles[spacing],
      className
    ].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  alignment?: 'left' | 'center' | 'right' | 'between';
  spacing?: 'sm' | 'md' | 'lg';
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ 
    children, 
    alignment = 'left',
    spacing = 'md',
    className = '',
    ...props 
  }, ref) => {
    const alignmentStyles = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
      between: 'justify-between',
    };

    const spacingStyles = {
      sm: 'pt-2',
      md: 'pt-4',
      lg: 'pt-6',
    };

    const classes = [
      'flex items-center',
      alignmentStyles[alignment],
      spacingStyles[spacing],
      className
    ].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// Title component for card headers
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: 'sm' | 'md' | 'lg';
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ 
    children, 
    size = 'md',
    className = '',
    ...props 
  }, ref) => {
    const sizeStyles = {
      sm: 'text-lg font-semibold',
      md: 'text-xl font-semibold',
      lg: 'text-2xl font-bold',
    };

    const classes = [
      'text-gray-900',
      sizeStyles[size],
      className
    ].filter(Boolean).join(' ');

    return (
      <h3
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

// Description component for card content
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: 'sm' | 'md';
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ 
    children, 
    size = 'md',
    className = '',
    ...props 
  }, ref) => {
    const sizeStyles = {
      sm: 'text-sm',
      md: 'text-base',
    };

    const classes = [
      'text-gray-600',
      sizeStyles[size],
      className
    ].filter(Boolean).join(' ');

    return (
      <p
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription };

