// contexts/AppContext.tsx - Global app state management
'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { 
  AppSettings, 
  UserProgress, 
  PracticeStatistics, 
  CategoryInfo, 
  ErrorState, 
  LoadingState,
  Toast,
  AnalyticsEvent,
  ChallengeCompletedEvent,
  PracticeSessionEvent,
  AchievementUnlockedEvent
} from '@/types/challenge';
import { storageService } from '@/lib/storage';
import { practiceDatabase } from '@/lib/database';

// App state interface
interface AppState {
  // User data
  userProgress: UserProgress;
  practiceStats: PracticeStatistics;
  
  // App configuration
  settings: AppSettings;
  categories: CategoryInfo[];
  
  // UI state
  isLoading: LoadingState;
  error: ErrorState | null;
  toasts: Toast[];
  
  // Feature flags and capabilities
  features: {
    ttsSupported: boolean;
    offlineSupported: boolean;
    fileSystemSupported: boolean;
  };
  
  // Session state
  currentSessionId: string | null;
  isOnline: boolean;
  lastSync: Date | null;
}

// Action types
type AppAction =
  // Settings actions
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'CLEAR_API_KEY' }
  
  // Progress actions
  | { type: 'UPDATE_USER_PROGRESS'; payload: Partial<UserProgress> }
  | { type: 'UPDATE_PRACTICE_STATS'; payload: Partial<PracticeStatistics> }
  | { type: 'COMPLETE_CHALLENGE'; payload: ChallengeCompletedEvent['properties'] }
  
  // UI actions
  | { type: 'SET_LOADING'; payload: LoadingState }
  | { type: 'SET_ERROR'; payload: ErrorState | null }
  | { type: 'ADD_TOAST'; payload: Omit<Toast, 'id'> }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'CLEAR_TOASTS' }
  
  // Data actions
  | { type: 'SET_CATEGORIES'; payload: CategoryInfo[] }
  | { type: 'UPDATE_CATEGORY'; payload: CategoryInfo }
  
  // System actions
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_CURRENT_SESSION'; payload: string | null }
  | { type: 'UPDATE_LAST_SYNC' }
  | { type: 'RESET_APP_STATE' }
  | { type: 'LOAD_APP_DATA'; payload: Partial<AppState> };

// Initial state
const initialState: AppState = {
  userProgress: {
    userId: 'default',
    completedChallenges: [],
    scores: {},
    totalPracticeTime: 0,
    categories: {},
    achievements: [],
    preferences: {
      theme: 'system',
      ttsEnabled: true,
      ttsRate: 1.0,
      ttsPitch: 1.0,
      autoPlayInstructions: true,
      codeEditorTheme: 'dark',
      fontSize: 14,
      difficulty: 'all',
      notifications: {
        enabled: true,
        practiceReminders: true,
        achievementAlerts: true,
        dailyGoals: true,
        schedule: {
          enabled: true,
          time: '18:00',
          days: [1, 2, 3, 4, 5] // Monday to Friday
        }
      }
    }
  },
  
  practiceStats: {
    totalSessions: 0,
    totalPracticeTime: 0,
    totalChallengesCompleted: 0,
    averageScore: 0,
    currentStreak: 0,
    bestStreak: 0,
    favoriteCategory: 'General',
    challengesByDifficulty: {
      beginner: 0,
      intermediate: 0,
      advanced: 0
    },
    dailyProgress: []
  },
  
  settings: {
    theme: 'system',
    ttsEnabled: true,
    ttsRate: 1.0,
    ttsPitch: 1.0,
    autoPlayInstructions: true,
    difficulty: 'all',
    codeEditor: {
      theme: 'dark',
      fontSize: 14,
      showLineNumbers: true,
      wordWrap: true,
      tabSize: 2,
      autoComplete: true
    },
    notifications: {
      enabled: true,
      practiceReminders: true,
      achievementAlerts: true,
      dailyGoals: true,
      schedule: {
        enabled: true,
        time: '18:00',
        days: [1, 2, 3, 4, 5]
      }
    },
    data: {
      autoBackup: true,
      backupFrequency: 'weekly',
      cloudSync: false,
      exportFormat: 'json'
    }
  },
  
  categories: [],
  
  isLoading: {
    isLoading: false
  },
  
  error: null,
  toasts: [],
  
  features: {
    ttsSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    offlineSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
    fileSystemSupported: typeof window !== 'undefined' && 'showOpenFilePicker' in window
  },
  
  currentSessionId: null,
  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  lastSync: null
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Settings actions
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
      
    case 'SET_API_KEY':
      return {
        ...state,
        settings: { ...state.settings, apiKey: action.payload }
      };
      
    case 'CLEAR_API_KEY':
      return {
        ...state,
        settings: { ...state.settings, apiKey: undefined }
      };
      
    // Progress actions
    case 'UPDATE_USER_PROGRESS':
      return {
        ...state,
        userProgress: { ...state.userProgress, ...action.payload }
      };
      
    case 'UPDATE_PRACTICE_STATS':
      return {
        ...state,
        practiceStats: { ...state.practiceStats, ...action.payload }
      };
      
    case 'COMPLETE_CHALLENGE':
      const { challengeId, category, difficulty, score, timeSpent, attempts } = action.payload;
      
      // Update user progress
      const updatedProgress = { ...state.userProgress };
      
      // Add to completed challenges if not already there
      if (!updatedProgress.completedChallenges.includes(challengeId)) {
        updatedProgress.completedChallenges.push(challengeId);
      }
      
      // Update score
      updatedProgress.scores[challengeId] = score;
      
      // Update practice time
      updatedProgress.totalPracticeTime += timeSpent;
      
      // Update category progress
      if (!updatedProgress.categories[category]) {
        updatedProgress.categories[category] = {
          completed: 0,
          total: 0,
          averageScore: 0,
          lastPracticed: new Date(),
          bestStreak: 0,
          timeSpent: 0
        };
      }
      
      const categoryProgress = updatedProgress.categories[category];
      categoryProgress.completed++;
      categoryProgress.lastPracticed = new Date();
      categoryProgress.timeSpent += timeSpent;
      
      // Update practice stats
      const updatedStats = { ...state.practiceStats };
      updatedStats.totalChallengesCompleted++;
      updatedStats.totalPracticeTime += timeSpent;
      
      // Update challenges by difficulty
      updatedStats.challengesByDifficulty = {
        ...updatedStats.challengesByDifficulty,
        [difficulty]: (updatedStats.challengesByDifficulty[difficulty] || 0) + 1
      };
      
      return {
        ...state,
        userProgress: updatedProgress,
        practiceStats: updatedStats
      };
      
    // UI actions
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
      
    case 'ADD_TOAST':
      const newToast: Toast = {
        ...action.payload,
        id: Math.random().toString(36).substr(2, 9)
      };
      return {
        ...state,
        toasts: [...state.toasts, newToast]
      };
      
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload)
      };
      
    case 'CLEAR_TOASTS':
      return {
        ...state,
        toasts: []
      };
      
    // Data actions
    case 'SET_CATEGORIES':
      return {
        ...state,
        categories: action.payload
      };
      
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(cat => 
          cat.name === action.payload.name ? action.payload : cat
        )
      };
      
    // System actions
    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        isOnline: action.payload
      };
      
    case 'SET_CURRENT_SESSION':
      return {
        ...state,
        currentSessionId: action.payload
      };
      
    case 'UPDATE_LAST_SYNC':
      return {
        ...state,
        lastSync: new Date()
      };
      
    case 'RESET_APP_STATE':
      return {
        ...initialState,
        features: state.features,
        isOnline: state.isOnline
      };
      
    case 'LOAD_APP_DATA':
      return {
        ...state,
        ...action.payload
      };
      
    default:
      return state;
  }
}

// Context interface
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Settings methods
  updateSettings: (settings: Partial<AppSettings>) => void;
  setApiKey: (apiKey: string) => void;
  clearApiKey: () => void;
  
  // Progress methods
  updateUserProgress: (progress: Partial<UserProgress>) => void;
  completeChallenge: (data: ChallengeCompletedEvent['properties']) => void;
  updatePracticeStats: (stats: Partial<PracticeStatistics>) => void;
  
  // UI methods
  setLoading: (loading: LoadingState) => void;
  setError: (error: ErrorState | null) => void;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Data methods
  loadCategories: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  
  // System methods
  checkOnlineStatus: () => boolean;
  setCurrentSession: (sessionId: string | null) => void;
  syncAppData: () => Promise<void>;
  resetAppState: () => void;
  exportAppData: () => Promise<string>;
  importAppData: (data: string) => Promise<boolean>;
  
  // Utility methods
  trackEvent: (event: Omit<AnalyticsEvent, 'timestamp' | 'userId' | 'sessionId'>) => void;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
    setupEventListeners();
  }, []);

  // Persist settings when they change
  useEffect(() => {
    if (state.settings) {
      storageService.saveAppSettings(state.settings).catch(console.error);
    }
  }, [state.settings]);

  // Persist user progress when it changes
  useEffect(() => {
    if (state.userProgress) {
      storageService.saveUserProgress(state.userProgress).catch(console.error);
    }
  }, [state.userProgress]);

  // Load initial app data
  const loadInitialData = async () => {
    try {
      setLoading({ isLoading: true, message: 'Loading app data...' });

      // Load settings
      const settings = await storageService.getAppSettings();
      if (settings) {
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
      }

      // Load user progress
      const userProgress = await storageService.getUserProgress();
      if (userProgress) {
        dispatch({ type: 'UPDATE_USER_PROGRESS', payload: userProgress });
      }

      // Load categories
      await loadCategories();

      // Update last sync time
      dispatch({ type: 'UPDATE_LAST_SYNC' });

      setLoading({ isLoading: false });
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError({
        hasError: true,
        message: 'Failed to load app data',
        code: 'LOAD_ERROR',
        retryable: true
      });
      setLoading({ isLoading: false });
    }
  };

  // Set up event listeners
  const setupEventListeners = () => {
    if (typeof window === 'undefined') return;

    // Online/offline detection
    window.addEventListener('online', () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
      showToast({
        type: 'success',
        title: 'Back online',
        message: 'Connection restored',
        duration: 3000
      });
    });

    window.addEventListener('offline', () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
      showToast({
        type: 'warning',
        title: 'Offline',
        message: 'Working in offline mode',
        duration: 5000
      });
    });

    // Before unload - save data
    window.addEventListener('beforeunload', () => {
      syncAppData().catch(console.error);
    });
  };

  // Settings methods
  const updateSettings = (settings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  const setApiKey = (apiKey: string) => {
    dispatch({ type: 'SET_API_KEY', payload: apiKey });
    storageService.updateApiKey(apiKey).catch(console.error);
  };

  const clearApiKey = () => {
    dispatch({ type: 'CLEAR_API_KEY' });
    storageService.removeApiKey().catch(console.error);
  };

  // Progress methods
  const updateUserProgress = (progress: Partial<UserProgress>) => {
    dispatch({ type: 'UPDATE_USER_PROGRESS', payload: progress });
  };

  const completeChallenge = (data: ChallengeCompletedEvent['properties']) => {
    dispatch({ type: 'COMPLETE_CHALLENGE', payload: data });
    
    // Track analytics event
    trackEvent({
      name: 'challenge_completed',
      properties: data
    });
  };

  const updatePracticeStats = (stats: Partial<PracticeStatistics>) => {
    dispatch({ type: 'UPDATE_PRACTICE_STATS', payload: stats });
  };

  // UI methods
  const setLoading = (loading: LoadingState) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: ErrorState | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const showToast = (toast: Omit<Toast, 'id'>) => {
    dispatch({ type: 'ADD_TOAST', payload: toast });
    
    // Auto-remove toast after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        // We'll remove by ID, but we need to get the ID from state
        // This is handled in a separate effect
      }, toast.duration);
    }
  };

  const removeToast = (id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  };

  const clearToasts = () => {
    dispatch({ type: 'CLEAR_TOASTS' });
  };

  // Data methods
  const loadCategories = async () => {
    try {
      const categoryNames = await practiceDatabase.getAllCategories();
      const challenges = await practiceDatabase.getDataScienceChallenges();
      
      const categories: CategoryInfo[] = categoryNames.map(name => {
        const categoryChallenges = challenges.filter(c => c.category === name);
        const progress = state.userProgress.categories[name] || {
          completed: 0,
          total: categoryChallenges.length,
          averageScore: 0,
          lastPracticed: new Date(),
          bestStreak: 0,
          timeSpent: 0
        };
        
        return {
          name,
          description: `${categoryChallenges.length} data science challenges`,
          challengeCount: categoryChallenges.length,
          difficulty: 'intermediate', // This could be calculated
          progress: progress.total > 0 ? (progress.completed / progress.total) * 100 : 0,
          lastPracticed: progress.lastPracticed
        };
      });
      
      dispatch({ type: 'SET_CATEGORIES', payload: categories });
    } catch (error) {
      console.error('Failed to load categories:', error);
      showToast({
        type: 'error',
        title: 'Load Error',
        message: 'Failed to load categories'
      });
    }
  };

  const refreshCategories = async () => {
    await loadCategories();
  };

  // System methods
  const checkOnlineStatus = (): boolean => {
    return state.isOnline;
  };

  const setCurrentSession = (sessionId: string | null) => {
    dispatch({ type: 'SET_CURRENT_SESSION', payload: sessionId });
  };

  const syncAppData = async (): Promise<void> => {
    if (!state.isOnline) return;

    try {
      setLoading({ isLoading: true, message: 'Syncing data...' });
      
      // Here you would sync with your backend service
      // For now, we'll just update the last sync time
      
      dispatch({ type: 'UPDATE_LAST_SYNC' });
      setLoading({ isLoading: false });
    } catch (error) {
      console.error('Sync failed:', error);
      setLoading({ isLoading: false });
      showToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to sync data with server'
      });
    }
  };

  const resetAppState = () => {
    dispatch({ type: 'RESET_APP_STATE' });
    storageService.clear().catch(console.error);
    practiceDatabase.clearAllData().catch(console.error);
  };

  const exportAppData = async (): Promise<string> => {
    try {
      setLoading({ isLoading: true, message: 'Exporting data...' });
      
      const exportData = await practiceDatabase.exportData();
      
      setLoading({ isLoading: false });
      showToast({
        type: 'success',
        title: 'Export Complete',
        message: 'Data exported successfully'
      });
      
      return exportData;
    } catch (error) {
      console.error('Export failed:', error);
      setLoading({ isLoading: false });
      showToast({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export app data'
      });
      throw error;
    }
  };

  const importAppData = async (data: string): Promise<boolean> => {
    try {
      setLoading({ isLoading: true, message: 'Importing data...' });
      
      const success = await practiceDatabase.importData(data);
      
      if (success) {
        // Reload app data
        await loadInitialData();
        showToast({
          type: 'success',
          title: 'Import Complete',
          message: 'Data imported successfully'
        });
      }
      
      setLoading({ isLoading: false });
      return success;
    } catch (error) {
      console.error('Import failed:', error);
      setLoading({ isLoading: false });
      showToast({
        type: 'error',
        title: 'Import Failed',
        message: 'Failed to import app data'
      });
      return false;
    }
  };

  // Utility methods
  const trackEvent = (event: Omit<AnalyticsEvent, 'timestamp' | 'userId' | 'sessionId'>) => {
    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date(),
      userId: state.userProgress.userId,
      sessionId: state.currentSessionId || 'no-session'
    };
    
    // In a real app, you would send this to your analytics service
    console.log('Analytics Event:', fullEvent);
    
    // For now, we'll just log it and update local stats
    if (event.name === 'challenge_completed') {
      // Stats are already updated in the reducer
    } else if (event.name === 'practice_session') {
      updatePracticeStats({
        totalSessions: state.practiceStats.totalSessions + 1
      });
    }
  };

  // Auto-remove toasts after their duration
  useEffect(() => {
    state.toasts.forEach(toast => {
      if (toast.duration && toast.duration > 0) {
        const timer = setTimeout(() => {
          removeToast(toast.id);
        }, toast.duration);
        
        return () => clearTimeout(timer);
      }
    });
  }, [state.toasts]);

  const contextValue: AppContextType = {
    state,
    dispatch,
    
    // Settings methods
    updateSettings,
    setApiKey,
    clearApiKey,
    
    // Progress methods
    updateUserProgress,
    completeChallenge,
    updatePracticeStats,
    
    // UI methods
    setLoading,
    setError,
    showToast,
    removeToast,
    clearToasts,
    
    // Data methods
    loadCategories,
    refreshCategories,
    
    // System methods
    checkOnlineStatus,
    setCurrentSession,
    syncAppData,
    resetAppState,
    exportAppData,
    importAppData,
    
    // Utility methods
    trackEvent
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the app context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Hook for specific state slices
export const useAppSettings = () => {
  const { state, updateSettings } = useApp();
  return { settings: state.settings, updateSettings };
};

export const useUserProgress = () => {
  const { state, updateUserProgress, completeChallenge } = useApp();
  return { 
    userProgress: state.userProgress, 
    updateUserProgress, 
    completeChallenge 
  };
};

export const useUI = () => {
  const { state, setLoading, setError, showToast, removeToast, clearToasts } = useApp();
  return {
    isLoading: state.isLoading,
    error: state.error,
    toasts: state.toasts,
    setLoading,
    setError,
    showToast,
    removeToast,
    clearToasts
  };
};

export const useCategories = () => {
  const { state, loadCategories, refreshCategories } = useApp();
  return {
    categories: state.categories,
    loadCategories,
    refreshCategories
  };
};

export const useSystem = () => {
  const { state, checkOnlineStatus, syncAppData, resetAppState, exportAppData, importAppData } = useApp();
  return {
    isOnline: state.isOnline,
    lastSync: state.lastSync,
    features: state.features,
    checkOnlineStatus,
    syncAppData,
    resetAppState,
    exportAppData,
    importAppData
  };
};

export default AppProvider;
