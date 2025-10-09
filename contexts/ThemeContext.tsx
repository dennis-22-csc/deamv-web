// contexts/ThemeContext.tsx - Theme preferences management
'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { AppTheme } from '@/types/challenge';
import { useApp } from './AppContext';

// Theme colors interface
export interface ThemeColors {
  primary: string;
  primaryDark: string;
  secondary: string;
  secondaryDark: string;
  accent: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  textPrimary: string;
  textSecondary: string;
  textInverse: string;
  border: string;
  borderLight: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  overlay: string;
  shadow: string;
}

// Theme configuration
export interface ThemeConfig {
  name: string;
  colors: ThemeColors;
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  animation: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      ease: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
}

// Theme state
interface ThemeState {
  currentTheme: AppTheme;
  resolvedTheme: 'light' | 'dark';
  themeConfig: ThemeConfig;
  isSystemTheme: boolean;
  isTransitioning: boolean;
}

// Action types
type ThemeAction =
  | { type: 'SET_THEME'; payload: AppTheme }
  | { type: 'SET_RESOLVED_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_THEME_CONFIG'; payload: ThemeConfig }
  | { type: 'SET_SYSTEM_THEME'; payload: boolean }
  | { type: 'SET_TRANSITIONING'; payload: boolean }
  | { type: 'TOGGLE_THEME' };

// Light theme configuration
const lightTheme: ThemeConfig = {
  name: 'light',
  colors: {
    primary: '#2D5F91',      // Deep Knowledge Blue
    primaryDark: '#1A3A5C',
    secondary: '#4CAF50',    // Growth Green
    secondaryDark: '#388E3C',
    accent: '#FF9800',       // Energy Orange
    background: '#F5F7FA',   // Light gray background
    surface: '#FFFFFF',      // White surface
    surfaceVariant: '#F8FAFC', // Slightly off-white
    textPrimary: '#263238',  // Dark gray text
    textSecondary: '#546E7A', // Medium gray text
    textInverse: '#FFFFFF',  // White text for dark backgrounds
    border: '#CFD8DC',       // Light gray border
    borderLight: '#ECEFF1',  // Very light gray border
    error: '#EF4444',        // Red
    warning: '#F59E0B',      // Amber
    success: '#10B981',      // Emerald
    info: '#3B82F6',         // Blue
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.1)'
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem' // 30px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem'    // 48px
  },
  borderRadius: {
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out'
    }
  }
};

// Dark theme configuration
const darkTheme: ThemeConfig = {
  ...lightTheme,
  name: 'dark',
  colors: {
    primary: '#3B82F6',      // Brighter blue for dark mode
    primaryDark: '#1E40AF',
    secondary: '#10B981',    // Brighter green for dark mode
    secondaryDark: '#047857',
    accent: '#F59E0B',       // Amber for better contrast
    background: '#121212',   // Dark background
    surface: '#1E1E1E',      // Dark surface
    surfaceVariant: '#2D2D2D', // Slightly lighter dark
    textPrimary: '#FFFFFF',  // White text
    textSecondary: '#B0BEC5', // Light gray text
    textInverse: '#1E1E1E',  // Dark text for light backgrounds
    border: '#374151',       // Dark gray border
    borderLight: '#4B5563',  // Medium dark gray border
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    info: '#3B82F6',
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.3)'
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
  }
};

// Initial state
const initialState: ThemeState = {
  currentTheme: 'system',
  resolvedTheme: 'light',
  themeConfig: lightTheme,
  isSystemTheme: true,
  isTransitioning: false
};

// Reducer function
function themeReducer(state: ThemeState, action: ThemeAction): ThemeState {
  switch (action.type) {
    case 'SET_THEME':
      return {
        ...state,
        currentTheme: action.payload,
        isSystemTheme: action.payload === 'system'
      };
      
    case 'SET_RESOLVED_THEME': {
      const newThemeConfig = action.payload === 'dark' ? darkTheme : lightTheme;
      return {
        ...state,
        resolvedTheme: action.payload,
        themeConfig: newThemeConfig
      };
    }
      
    case 'SET_THEME_CONFIG':
      return {
        ...state,
        themeConfig: action.payload
      };
      
    case 'SET_SYSTEM_THEME':
      return {
        ...state,
        isSystemTheme: action.payload
      };
      
    case 'SET_TRANSITIONING':
      return {
        ...state,
        isTransitioning: action.payload
      };
      
    case 'TOGGLE_THEME': {
      const newTheme = state.resolvedTheme === 'light' ? 'dark' : 'light';
      return {
        ...state,
        currentTheme: newTheme,
        resolvedTheme: newTheme,
        themeConfig: newTheme === 'dark' ? darkTheme : lightTheme,
        isSystemTheme: false
      };
    }
      
    default:
      return state;
  }
}

// Context interface
interface ThemeContextType {
  state: ThemeState;
  dispatch: React.Dispatch<ThemeAction>;
  
  // Theme management
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  getResolvedTheme: () => 'light' | 'dark';
  
  // Theme application
  applyTheme: (theme: AppTheme) => void;
  updateCSSVariables: () => void;
  
  // Utility methods
  getColor: (colorPath: string) => string;
  getSpacing: (size: keyof ThemeConfig['spacing']) => string;
  getBorderRadius: (size: keyof ThemeConfig['borderRadius']) => string;
  getShadow: (size: keyof ThemeConfig['shadows']) => string;
  
  // System theme detection
  getSystemTheme: () => 'light' | 'dark';
  watchSystemTheme: () => void;
  stopWatchingSystemTheme: () => void;
}

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provider component
interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);
  const { updateSettings, state: appState } = useApp();
  const mediaQueryRef = React.useRef<MediaQueryList | null>(null);

  // Initialize theme on mount
  useEffect(() => {
    initializeTheme();
    return () => {
      stopWatchingSystemTheme();
    };
  }, []);

  // Update theme when app settings change
  useEffect(() => {
    if (appState.settings.theme && appState.settings.theme !== state.currentTheme) {
      setTheme(appState.settings.theme);
    }
  }, [appState.settings.theme]);

  // Initialize theme from stored preferences
  const initializeTheme = useCallback(() => {
    const storedTheme = appState.settings.theme || 'system';
    setTheme(storedTheme);
  }, [appState.settings.theme]);

  // Set theme and update all necessary states
  const setTheme = useCallback((theme: AppTheme) => {
    // Start transition
    dispatch({ type: 'SET_TRANSITIONING', payload: true });

    // Update local state
    dispatch({ type: 'SET_THEME', payload: theme });

    // Determine resolved theme
    let resolvedTheme: 'light' | 'dark';
    if (theme === 'system') {
      resolvedTheme = getSystemTheme();
      dispatch({ type: 'SET_SYSTEM_THEME', payload: true });
      watchSystemTheme();
    } else {
      resolvedTheme = theme;
      dispatch({ type: 'SET_SYSTEM_THEME', payload: false });
      stopWatchingSystemTheme();
    }

    // Update resolved theme
    dispatch({ type: 'SET_RESOLVED_THEME', payload: resolvedTheme });

    // Apply to DOM
    applyThemeToDOM(resolvedTheme);

    // Update CSS variables
    updateCSSVariables();

    // Save to app settings
    updateSettings({ theme });

    // End transition after animation
    setTimeout(() => {
      dispatch({ type: 'SET_TRANSITIONING', payload: false });
    }, 300);
  }, [updateSettings]);

  // Toggle between light and dark themes
  const toggleTheme = useCallback(() => {
    dispatch({ type: 'TOGGLE_THEME' });
    
    const newTheme = state.resolvedTheme === 'light' ? 'dark' : 'light';
    applyThemeToDOM(newTheme);
    updateCSSVariables();
    updateSettings({ theme: newTheme });
  }, [state.resolvedTheme, updateSettings]);

  // Get the currently resolved theme (light or dark)
  const getResolvedTheme = useCallback((): 'light' | 'dark' => {
    return state.resolvedTheme;
  }, [state.resolvedTheme]);

  // Apply theme to the application
  const applyTheme = useCallback((theme: AppTheme) => {
    setTheme(theme);
  }, [setTheme]);

  // Update CSS custom properties with theme values
  const updateCSSVariables = useCallback(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const config = state.themeConfig;

    // Set color variables
    Object.entries(config.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Set typography variables
    Object.entries(config.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--text-${key}`, value);
    });

    Object.entries(config.typography.fontWeight).forEach(([key, value]) => {
      root.style.setProperty(`--font-${key}`, value.toString());
    });

    // Set spacing variables
    Object.entries(config.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });

    // Set border radius variables
    Object.entries(config.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });

    // Set shadow variables
    Object.entries(config.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    // Set animation variables
    Object.entries(config.animation.duration).forEach(([key, value]) => {
      root.style.setProperty(`--duration-${key}`, value);
    });

    Object.entries(config.animation.easing).forEach(([key, value]) => {
      root.style.setProperty(`--easing-${key}`, value);
    });

    // Set theme class for CSS selectors
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${state.resolvedTheme}`);

    // Update meta theme-color for mobile browsers
    updateMetaThemeColor(config.colors.primary);
  }, [state.themeConfig, state.resolvedTheme]);

  // Get color value by path
  const getColor = useCallback((colorPath: string): string => {
    const path = colorPath.split('.');
    let value: any = state.themeConfig.colors;
    
    for (const key of path) {
      value = value[key];
      if (value === undefined) {
        console.warn(`Color not found: ${colorPath}`);
        return state.themeConfig.colors.primary;
      }
    }
    
    return value;
  }, [state.themeConfig.colors]);

  // Get spacing value
  const getSpacing = useCallback((size: keyof ThemeConfig['spacing']): string => {
    return state.themeConfig.spacing[size];
  }, [state.themeConfig.spacing]);

  // Get border radius value
  const getBorderRadius = useCallback((size: keyof ThemeConfig['borderRadius']): string => {
    return state.themeConfig.borderRadius[size];
  }, [state.themeConfig.borderRadius]);

  // Get shadow value
  const getShadow = useCallback((size: keyof ThemeConfig['shadows']): string => {
    return state.themeConfig.shadows[size];
  }, [state.themeConfig.shadows]);

  // Get system theme preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Watch for system theme changes
  const watchSystemTheme = useCallback(() => {
    if (typeof window === 'undefined') return;

    mediaQueryRef.current = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (state.isSystemTheme) {
        const newTheme = e.matches ? 'dark' : 'light';
        dispatch({ type: 'SET_RESOLVED_THEME', payload: newTheme });
        applyThemeToDOM(newTheme);
        updateCSSVariables();
      }
    };

    mediaQueryRef.current.addEventListener('change', handleSystemThemeChange);
  }, [state.isSystemTheme]);

  // Stop watching system theme changes
  const stopWatchingSystemTheme = useCallback(() => {
    if (mediaQueryRef.current) {
      mediaQueryRef.current.removeEventListener('change', () => {});
      mediaQueryRef.current = null;
    }
  }, []);

  // Apply theme to DOM attributes and classes
  const applyThemeToDOM = useCallback((theme: 'light' | 'dark') => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    
    // Set data-theme attribute for JavaScript detection
    root.setAttribute('data-theme', theme);
    
    // Set class for CSS targeting
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, []);

  // Update meta theme-color for mobile browsers
  const updateMetaThemeColor = useCallback((color: string) => {
    if (typeof document === 'undefined') return;

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    
    metaThemeColor.setAttribute('content', color);
  }, []);

  // Generate CSS for theme variables (for styled-components or CSS-in-JS)
  const generateThemeCSS = useCallback((): string => {
    const config = state.themeConfig;
    let css = ':root {\n';

    // Color variables
    Object.entries(config.colors).forEach(([key, value]) => {
      css += `  --color-${key}: ${value};\n`;
    });

    // Typography variables
    Object.entries(config.typography.fontSize).forEach(([key, value]) => {
      css += `  --text-${key}: ${value};\n`;
    });

    Object.entries(config.typography.fontWeight).forEach(([key, value]) => {
      css += `  --font-${key}: ${value};\n`;
    });

    // Spacing variables
    Object.entries(config.spacing).forEach(([key, value]) => {
      css += `  --spacing-${key}: ${value};\n`;
    });

    // Border radius variables
    Object.entries(config.borderRadius).forEach(([key, value]) => {
      css += `  --radius-${key}: ${value};\n`;
    });

    // Shadow variables
    Object.entries(config.shadows).forEach(([key, value]) => {
      css += `  --shadow-${key}: ${value};\n`;
    });

    // Animation variables
    Object.entries(config.animation.duration).forEach(([key, value]) => {
      css += `  --duration-${key}: ${value};\n`;
    });

    Object.entries(config.animation.easing).forEach(([key, value]) => {
      css += `  --easing-${key}: ${value};\n`;
    });

    css += '}\n';

    // Theme-specific classes
    css += `
.theme-light {
  color-scheme: light;
}

.theme-dark {
  color-scheme: dark;
}

.theme-transition * {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
    `;

    return css;
  }, [state.themeConfig]);

  const contextValue: ThemeContextType = {
    state,
    dispatch,
    
    // Theme management
    setTheme,
    toggleTheme,
    getResolvedTheme,
    
    // Theme application
    applyTheme,
    updateCSSVariables,
    
    // Utility methods
    getColor,
    getSpacing,
    getBorderRadius,
    getShadow,
    
    // System theme detection
    getSystemTheme,
    watchSystemTheme,
    stopWatchingSystemTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <div 
        className={`theme-container ${state.isTransitioning ? 'theme-transition' : ''}`}
        data-theme={state.resolvedTheme}
      >
        {children}
      </div>
      
      {/* Inject theme CSS variables */}
      <style jsx global>{`
        :root {
          /* Color variables */
          ${Object.entries(state.themeConfig.colors).map(([key, value]) => 
            `--color-${key}: ${value};`
          ).join('\n')}
          
          /* Typography variables */
          ${Object.entries(state.themeConfig.typography.fontSize).map(([key, value]) => 
            `--text-${key}: ${value};`
          ).join('\n')}
          
          ${Object.entries(state.themeConfig.typography.fontWeight).map(([key, value]) => 
            `--font-${key}: ${value};`
          ).join('\n')}
          
          /* Spacing variables */
          ${Object.entries(state.themeConfig.spacing).map(([key, value]) => 
            `--spacing-${key}: ${value};`
          ).join('\n')}
          
          /* Border radius variables */
          ${Object.entries(state.themeConfig.borderRadius).map(([key, value]) => 
            `--radius-${key}: ${value};`
          ).join('\n')}
          
          /* Shadow variables */
          ${Object.entries(state.themeConfig.shadows).map(([key, value]) => 
            `--shadow-${key}: ${value};`
          ).join('\n')}
          
          /* Animation variables */
          ${Object.entries(state.themeConfig.animation.duration).map(([key, value]) => 
            `--duration-${key}: ${value};`
          ).join('\n')}
          
          ${Object.entries(state.themeConfig.animation.easing).map(([key, value]) => 
            `--easing-${key}: ${value};`
          ).join('\n')}
        }
        
        .theme-light {
          color-scheme: light;
        }
        
        .theme-dark {
          color-scheme: dark;
        }
        
        .theme-transition * {
          transition: background-color 0.3s ease, 
                      color 0.3s ease, 
                      border-color 0.3s ease,
                      box-shadow 0.3s ease;
        }
      `}</style>
    </ThemeContext.Provider>
  );
};

// Hook to use the theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook for theme values
export const useThemeConfig = () => {
  const { state, setTheme, toggleTheme } = useTheme();
  return {
    theme: state.currentTheme,
    resolvedTheme: state.resolvedTheme,
    themeConfig: state.themeConfig,
    isSystemTheme: state.isSystemTheme,
    isTransitioning: state.isTransitioning,
    setTheme,
    toggleTheme
  };
};

// Hook for theme colors
export const useThemeColors = () => {
  const { state, getColor } = useTheme();
  return {
    colors: state.themeConfig.colors,
    getColor
  };
};

// Hook for design tokens
export const useDesignTokens = () => {
  const { state, getSpacing, getBorderRadius, getShadow } = useTheme();
  return {
    spacing: state.themeConfig.spacing,
    borderRadius: state.themeConfig.borderRadius,
    shadows: state.themeConfig.shadows,
    typography: state.themeConfig.typography,
    getSpacing,
    getBorderRadius,
    getShadow
  };
};

// Higher-order component for theme-aware components
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

export default ThemeProvider;
