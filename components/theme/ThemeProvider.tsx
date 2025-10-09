import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ColorScheme = 'light' | 'dark';

interface ThemeColors {
  primary: string;
  primaryDark: string;
  secondary: string;
  secondaryDark: string;
  accent: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const lightColors: ThemeColors = {
  primary: '#2D5F91',      // edu_primary - Deep Knowledge Blue
  primaryDark: '#1A3A5C',  // edu_primary_dark
  secondary: '#4CAF50',    // edu_secondary - Growth Green
  secondaryDark: '#388E3C', // edu_secondary_dark
  accent: '#FF9800',       // edu_accent - Energy Orange
  background: '#F5F7FA',   // edu_background
  surface: '#FFFFFF',      // edu_surface
  textPrimary: '#263238',  // edu_text_primary
  textSecondary: '#546E7A', // edu_text_secondary
  border: '#CFD8DC',       // edu_border
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
};

const darkColors: ThemeColors = {
  primary: '#3B82F6',      // Brighter blue for dark mode
  primaryDark: '#1E40AF',
  secondary: '#10B981',    // Brighter green for dark mode
  secondaryDark: '#047857',
  accent: '#F59E0B',       // Amber for better contrast
  background: '#121212',   // edu_dark_background
  surface: '#1E1E1E',      // edu_dark_surface
  textPrimary: '#FFFFFF',  // edu_dark_text_primary
  textSecondary: '#B0BEC5', // edu_dark_text_secondary
  border: '#374151',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = 'deamv-theme',
}) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    
    try {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');

  // Determine color scheme based on theme and system preference
  useEffect(() => {
    const root = window.document.documentElement;
    
    const updateColorScheme = () => {
      let newColorScheme: ColorScheme = 'light';
      
      if (theme === 'dark') {
        newColorScheme = 'dark';
      } else if (theme === 'system') {
        newColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      setColorScheme(newColorScheme);
      
      // Update data-theme attribute and class
      root.setAttribute('data-theme', newColorScheme);
      root.classList.remove('light', 'dark');
      root.classList.add(newColorScheme);
      
      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', newColorScheme === 'dark' ? darkColors.primary : lightColors.primary);
      }
    };

    updateColorScheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        updateColorScheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  // Persist theme to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }, [theme, storageKey]);

  const value: ThemeContextType = {
    theme,
    colorScheme,
    colors: colorScheme === 'dark' ? darkColors : lightColors,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme);
    },
    toggleTheme: () => {
      setTheme(current => {
        if (current === 'light') return 'dark';
        if (current === 'dark') return 'system';
        return 'light';
      });
    },
    isDark: colorScheme === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme toggle component
interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const { theme, colorScheme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const getThemeIcon = () => {
    if (theme === 'system') {
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }
    
    return colorScheme === 'dark' ? (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ) : (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  };

  const getThemeLabel = () => {
    if (theme === 'system') return 'System';
    return colorScheme === 'dark' ? 'Dark' : 'Light';
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 
        hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 
        dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white
        transition-colors duration-200
        ${sizeClasses[size]}
        ${className}
      `}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
    >
      {getThemeIcon()}
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {getThemeLabel()}
        </span>
      )}
    </button>
  );
};

// Theme selector dropdown
interface ThemeSelectorProps {
  position?: 'left' | 'right';
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  position = 'right',
  className = '',
}) => {
  const { theme, setTheme, colorScheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { value: 'light' as Theme, label: 'Light', icon: '☀️' },
    { value: 'dark' as Theme, label: 'Dark', icon: '🌙' },
    { value: 'system' as Theme, label: 'System', icon: '💻' },
  ];

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        <span className="flex items-center gap-2">
          <span>
            {themes.find(t => t.value === theme)?.icon}
          </span>
          {themes.find(t => t.value === theme)?.label}
        </span>
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`
          absolute ${position === 'right' ? 'right-0' : 'left-0'} mt-2 w-48 origin-top-right 
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg 
          ring-1 ring-black ring-opacity-5 focus:outline-none z-50
        `}>
          <div className="py-1">
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => {
                  setTheme(themeOption.value);
                  setIsOpen(false);
                }}
                className={`
                  flex items-center gap-3 w-full px-4 py-2 text-sm text-left
                  ${theme === themeOption.value
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <span className="text-base">{themeOption.icon}</span>
                <span>{themeOption.label}</span>
                {theme === themeOption.value && (
                  <svg className="w-4 h-4 ml-auto text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// High-order component for theme-aware styling
export const withTheme = <P extends object>(
  Component: React.ComponentType<P & { theme: ThemeContextType }>
) => {
  const ThemedComponent: React.FC<P> = (props) => {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
  
  ThemedComponent.displayName = `WithTheme(${Component.displayName || Component.name})`;
  return ThemedComponent;
};

// CSS variables injection for dynamic theming
export const ThemeVariables: React.FC = () => {
  const { colors } = useTheme();

  return (
    <style jsx global>{`
      :root {
        --color-primary: ${colors.primary};
        --color-primary-dark: ${colors.primaryDark};
        --color-secondary: ${colors.secondary};
        --color-secondary-dark: ${colors.secondaryDark};
        --color-accent: ${colors.accent};
        --color-background: ${colors.background};
        --color-surface: ${colors.surface};
        --color-text-primary: ${colors.textPrimary};
        --color-text-secondary: ${colors.textSecondary};
        --color-border: ${colors.border};
        --color-error: ${colors.error};
        --color-warning: ${colors.warning};
        --color-success: ${colors.success};
        --color-info: ${colors.info};
      }

      .bg-primary { background-color: var(--color-primary); }
      .bg-primary-dark { background-color: var(--color-primary-dark); }
      .bg-secondary { background-color: var(--color-secondary); }
      .text-primary { color: var(--color-primary); }
      .text-secondary { color: var(--color-secondary); }
      .border-primary { border-color: var(--color-primary); }
      
      .theme-transition * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
      }
    `}</style>
  );
};

export default ThemeProvider;
