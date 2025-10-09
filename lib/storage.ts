// Local storage management (replaces Android SharedPreferences)
import localforage from 'localforage';

// Storage keys
export const STORAGE_KEYS = {
  // API Configuration
  API_KEY: 'gemini_api_key',
  
  // App Settings
  THEME: 'app_theme',
  TTS_ENABLED: 'tts_enabled',
  TTS_RATE: 'tts_rate',
  TTS_PITCH: 'tts_pitch',
  AUTO_PLAY: 'auto_play_instructions',
  DIFFICULTY: 'preferred_difficulty',
  LANGUAGE: 'app_language',
  
  // User Preferences
  LAST_CATEGORY: 'last_selected_category',
  RECENT_CATEGORIES: 'recent_categories',
  FAVORITE_CHALLENGES: 'favorite_challenges',
  
  // Practice Session
  CURRENT_SESSION: 'current_practice_session',
  SESSION_PROGRESS: 'session_progress',
  
  // Analytics & Usage
  USAGE_STATS: 'usage_statistics',
  LAST_ACTIVE: 'last_active_time',
  APP_LAUNCH_COUNT: 'app_launch_count',
  
  // Data Management
  LAST_BACKUP: 'last_backup_time',
  DATA_VERSION: 'data_version',
  
  // UI State
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  CODE_EDITOR_THEME: 'code_editor_theme',
  FONT_SIZE: 'font_size',
  
  // Notifications
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  NOTIFICATION_SCHEDULE: 'notification_schedule',
} as const;

// Default values
const DEFAULT_VALUES = {
  [STORAGE_KEYS.THEME]: 'system',
  [STORAGE_KEYS.TTS_ENABLED]: true,
  [STORAGE_KEYS.TTS_RATE]: 1.0,
  [STORAGE_KEYS.TTS_PITCH]: 1.0,
  [STORAGE_KEYS.AUTO_PLAY]: true,
  [STORAGE_KEYS.DIFFICULTY]: 'all',
  [STORAGE_KEYS.LANGUAGE]: 'en',
  [STORAGE_KEYS.NOTIFICATIONS_ENABLED]: true,
  [STORAGE_KEYS.CODE_EDITOR_THEME]: 'dark',
  [STORAGE_KEYS.FONT_SIZE]: 14,
} as const;

// Types
export interface StorageConfig {
  driver?: string;
  name?: string;
  version?: number;
  storeName?: string;
  description?: string;
}

export interface UsageStatistics {
  totalPracticeTime: number;
  challengesCompleted: number;
  sessionsCompleted: number;
  categoriesPracticed: string[];
  lastPracticeDate: string;
  streak: number;
  averageScore: number;
}

export interface RecentCategory {
  name: string;
  lastAccessed: Date;
  challengeCount: number;
}

export interface NotificationSchedule {
  enabled: boolean;
  time: string; // HH:MM format
  days: number[]; // 0-6 (Sunday-Saturday)
}

// Storage service class
class StorageService {
  private storage: Storage | null = null;
  private isInitialized = false;
  private useLocalForage = true;

  async initialize(config?: StorageConfig): Promise<void> {
    if (this.isInitialized) return;

    // ✅ Check if we are in a browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
      this.useLocalForage = true;
      
      // Initialize localForage only in browser environment
      const defaultConfig: StorageConfig = {
        driver: localforage.INDEXEDDB,
        name: 'DeamV',
        version: 1.0,
        storeName: 'deamv_preferences',
        description: 'DeamV Practice App Local Storage'
      };

      localforage.config({ ...defaultConfig, ...config });
    } else {
      // ✅ Graceful fallback (for SSR or Node)
      this.storage = null;
      this.useLocalForage = false;
      console.warn('⚠️ StorageService: running without browser storage.');
    }

    this.isInitialized = true;
  }

  // ===== BASIC STORAGE OPERATIONS =====

  async setItem<T>(key: string, value: T): Promise<void> {
    await this.initialize();
    
    try {
      if (this.useLocalForage) {
        await localforage.setItem(key, value);
      } else if (this.storage) {
        // Fallback to localStorage if localForage is not available
        this.storage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      throw new Error(`Storage write failed for key: ${key}`);
    }
  }

  async getItem<T>(key: string, defaultValue?: T): Promise<T> {
    await this.initialize();

    try {
      if (this.useLocalForage) {
        const value = await localforage.getItem<T>(key);
        return value !== null ? value : (defaultValue as T);
      } else if (this.storage) {
        // Fallback to localStorage if localForage is not available
        const item = this.storage.getItem(key);
        return item ? JSON.parse(item) : (defaultValue as T);
      } else {
        return defaultValue as T;
      }
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return defaultValue as T;
    }
  }

  async removeItem(key: string): Promise<void> {
    await this.initialize();

    try {
      if (this.useLocalForage) {
        await localforage.removeItem(key);
      } else if (this.storage) {
        this.storage.removeItem(key);
      }
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
      throw new Error(`Storage removal failed for key: ${key}`);
    }
  }

  async clear(): Promise<void> {
    await this.initialize();

    try {
      if (this.useLocalForage) {
        await localforage.clear();
      } else if (this.storage) {
        this.storage.clear();
      }
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw new Error('Storage clearance failed');
    }
  }

  async keys(): Promise<string[]> {
    await this.initialize();

    try {
      if (this.useLocalForage) {
        return await localforage.keys();
      } else if (this.storage) {
        return Object.keys(this.storage);
      } else {
        return [];
      }
    } catch (error) {
      console.error('Failed to get storage keys:', error);
      return [];
    }
  }

  // ===== API KEY MANAGEMENT =====

  async getApiKey(): Promise<string | null> {
    return this.getItem<string | null>(STORAGE_KEYS.API_KEY, null);
  }

  async saveApiKey(apiKey: string): Promise<void> {
    // Basic validation
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key');
    }

    // Additional validation for Gemini API key format
    if (!apiKey.startsWith('AIza')) {
      console.warn('API key does not match expected Gemini format');
    }

    await this.setItem(STORAGE_KEYS.API_KEY, apiKey);
  }

  async removeApiKey(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.API_KEY);
  }

  async hasApiKey(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    return !!apiKey && apiKey.length > 0;
  }

  // ===== APP SETTINGS =====

  async getTheme(): Promise<string> {
    return this.getItem(STORAGE_KEYS.THEME, DEFAULT_VALUES[STORAGE_KEYS.THEME]);
  }

  async setTheme(theme: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.THEME, theme);
  }

  async isTtsEnabled(): Promise<boolean> {
    return this.getItem(STORAGE_KEYS.TTS_ENABLED, DEFAULT_VALUES[STORAGE_KEYS.TTS_ENABLED]);
  }

  async setTtsEnabled(enabled: boolean): Promise<void> {
    await this.setItem(STORAGE_KEYS.TTS_ENABLED, enabled);
  }

  async getTtsRate(): Promise<number> {
    return this.getItem(STORAGE_KEYS.TTS_RATE, DEFAULT_VALUES[STORAGE_KEYS.TTS_RATE]);
  }

  async setTtsRate(rate: number): Promise<void> {
    if (rate < 0.1 || rate > 2.0) {
      throw new Error('TTS rate must be between 0.1 and 2.0');
    }
    await this.setItem(STORAGE_KEYS.TTS_RATE, rate);
  }

  async getTtsPitch(): Promise<number> {
    return this.getItem(STORAGE_KEYS.TTS_PITCH, DEFAULT_VALUES[STORAGE_KEYS.TTS_PITCH]);
  }

  async setTtsPitch(pitch: number): Promise<void> {
    if (pitch < 0.1 || pitch > 2.0) {
      throw new Error('TTS pitch must be between 0.1 and 2.0');
    }
    await this.setItem(STORAGE_KEYS.TTS_PITCH, pitch);
  }

  async isAutoPlayEnabled(): Promise<boolean> {
    return this.getItem(STORAGE_KEYS.AUTO_PLAY, DEFAULT_VALUES[STORAGE_KEYS.AUTO_PLAY]);
  }

  async setAutoPlayEnabled(enabled: boolean): Promise<void> {
    await this.setItem(STORAGE_KEYS.AUTO_PLAY, enabled);
  }

  async getDifficulty(): Promise<string> {
    return this.getItem(STORAGE_KEYS.DIFFICULTY, DEFAULT_VALUES[STORAGE_KEYS.DIFFICULTY]);
  }

  async setDifficulty(difficulty: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.DIFFICULTY, difficulty);
  }

  // ===== USER PREFERENCES =====

  async getLastCategory(): Promise<string> {
    return this.getItem(STORAGE_KEYS.LAST_CATEGORY, 'General');
  }

  async setLastCategory(category: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.LAST_CATEGORY, category);
    
    // Also update recent categories
    await this.addRecentCategory(category);
  }

  async getRecentCategories(): Promise<RecentCategory[]> {
    return this.getItem<RecentCategory[]>(STORAGE_KEYS.RECENT_CATEGORIES, []);
  }

  async addRecentCategory(category: string, challengeCount: number = 0): Promise<void> {
    const recentCategories = await this.getRecentCategories();
    
    // Remove if already exists
    const filtered = recentCategories.filter(cat => cat.name !== category);
    
    // Add to beginning
    const updated: RecentCategory[] = [
      {
        name: category,
        lastAccessed: new Date(),
        challengeCount
      },
      ...filtered
    ].slice(0, 10); // Keep only last 10
    
    await this.setItem(STORAGE_KEYS.RECENT_CATEGORIES, updated);
  }

  async getFavoriteChallenges(): Promise<string[]> {
    return this.getItem<string[]>(STORAGE_KEYS.FAVORITE_CHALLENGES, []);
  }

  async addFavoriteChallenge(challengeId: string): Promise<void> {
    const favorites = await this.getFavoriteChallenges();
    
    if (!favorites.includes(challengeId)) {
      favorites.push(challengeId);
      await this.setItem(STORAGE_KEYS.FAVORITE_CHALLENGES, favorites);
    }
  }

  async removeFavoriteChallenge(challengeId: string): Promise<void> {
    const favorites = await this.getFavoriteChallenges();
    const updated = favorites.filter(id => id !== challengeId);
    await this.setItem(STORAGE_KEYS.FAVORITE_CHALLENGES, updated);
  }

  async isChallengeFavorite(challengeId: string): Promise<boolean> {
    const favorites = await this.getFavoriteChallenges();
    return favorites.includes(challengeId);
  }

  // ===== USAGE STATISTICS =====

  async getUsageStatistics(): Promise<UsageStatistics> {
    const defaultStats: UsageStatistics = {
      totalPracticeTime: 0,
      challengesCompleted: 0,
      sessionsCompleted: 0,
      categoriesPracticed: [],
      lastPracticeDate: new Date().toISOString().split('T')[0],
      streak: 0,
      averageScore: 0
    };

    return this.getItem<UsageStatistics>(STORAGE_KEYS.USAGE_STATS, defaultStats);
  }

  async updateUsageStatistics(updates: Partial<UsageStatistics>): Promise<void> {
    const currentStats = await this.getUsageStatistics();
    const updatedStats: UsageStatistics = {
      ...currentStats,
      ...updates,
      lastPracticeDate: new Date().toISOString().split('T')[0]
    };

    await this.setItem(STORAGE_KEYS.USAGE_STATS, updatedStats);
  }

  async incrementPracticeTime(minutes: number): Promise<void> {
    const stats = await this.getUsageStatistics();
    await this.updateUsageStatistics({
      totalPracticeTime: stats.totalPracticeTime + minutes
    });
  }

  async incrementChallengesCompleted(): Promise<void> {
    const stats = await this.getUsageStatistics();
    await this.updateUsageStatistics({
      challengesCompleted: stats.challengesCompleted + 1
    });
  }

  async updateStreak(): Promise<void> {
    const stats = await this.getUsageStatistics();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let newStreak = stats.streak;
    
    if (stats.lastPracticeDate === yesterday) {
      newStreak += 1;
    } else if (stats.lastPracticeDate !== today) {
      newStreak = 1; // Reset streak if missed a day
    }

    await this.updateUsageStatistics({
      streak: newStreak
    });
  }

  // ===== SESSION MANAGEMENT =====

  async getCurrentSession(): Promise<any> {
    return this.getItem(STORAGE_KEYS.CURRENT_SESSION, null);
  }

  async saveCurrentSession(session: any): Promise<void> {
    await this.setItem(STORAGE_KEYS.CURRENT_SESSION, session);
  }

  async clearCurrentSession(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.CURRENT_SESSION);
  }

  async getSessionProgress(): Promise<number> {
    return this.getItem(STORAGE_KEYS.SESSION_PROGRESS, 0);
  }

  async setSessionProgress(progress: number): Promise<void> {
    await this.setItem(STORAGE_KEYS.SESSION_PROGRESS, progress);
  }

  // ===== NOTIFICATION SETTINGS =====

  async getNotificationSchedule(): Promise<NotificationSchedule> {
    const defaultSchedule: NotificationSchedule = {
      enabled: true,
      time: '18:00',
      days: [1, 2, 3, 4, 5] // Monday to Friday
    };

    return this.getItem<NotificationSchedule>(STORAGE_KEYS.NOTIFICATION_SCHEDULE, defaultSchedule);
  }

  async setNotificationSchedule(schedule: NotificationSchedule): Promise<void> {
    await this.setItem(STORAGE_KEYS.NOTIFICATION_SCHEDULE, schedule);
  }

  async areNotificationsEnabled(): Promise<boolean> {
    return this.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, DEFAULT_VALUES[STORAGE_KEYS.NOTIFICATIONS_ENABLED]);
  }

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    await this.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, enabled);
  }

  // ===== APP STATE MANAGEMENT =====

  async getLastActiveTime(): Promise<Date> {
    const timestamp = await this.getItem<number>(STORAGE_KEYS.LAST_ACTIVE, 0);
    return new Date(timestamp);
  }

  async updateLastActiveTime(): Promise<void> {
    await this.setItem(STORAGE_KEYS.LAST_ACTIVE, Date.now());
  }

  async getAppLaunchCount(): Promise<number> {
    return this.getItem<number>(STORAGE_KEYS.APP_LAUNCH_COUNT, 0);
  }

  async incrementAppLaunchCount(): Promise<void> {
    const count = await this.getAppLaunchCount();
    await this.setItem(STORAGE_KEYS.APP_LAUNCH_COUNT, count + 1);
  }

  // ===== DATA MANAGEMENT =====

  async getLastBackupTime(): Promise<Date | null> {
    const timestamp = await this.getItem<number>(STORAGE_KEYS.LAST_BACKUP, 0);
    return timestamp > 0 ? new Date(timestamp) : null;
  }

  async updateLastBackupTime(): Promise<void> {
    await this.setItem(STORAGE_KEYS.LAST_BACKUP, Date.now());
  }

  async getDataVersion(): Promise<string> {
    return this.getItem(STORAGE_KEYS.DATA_VERSION, '1.0.0');
  }

  async setDataVersion(version: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.DATA_VERSION, version);
  }

  // ===== UI STATE =====

  async isSidebarCollapsed(): Promise<boolean> {
    return this.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
  }

  async setSidebarCollapsed(collapsed: boolean): Promise<void> {
    await this.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
  }

  async getCodeEditorTheme(): Promise<string> {
    return this.getItem(STORAGE_KEYS.CODE_EDITOR_THEME, DEFAULT_VALUES[STORAGE_KEYS.CODE_EDITOR_THEME]);
  }

  async setCodeEditorTheme(theme: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.CODE_EDITOR_THEME, theme);
  }

  async getFontSize(): Promise<number> {
    return this.getItem(STORAGE_KEYS.FONT_SIZE, DEFAULT_VALUES[STORAGE_KEYS.FONT_SIZE]);
  }

  async setFontSize(size: number): Promise<void> {
    if (size < 8 || size > 24) {
      throw new Error('Font size must be between 8 and 24');
    }
    await this.setItem(STORAGE_KEYS.FONT_SIZE, size);
  }

  // ===== MIGRATION & MAINTENANCE =====

  async getAllData(): Promise<Record<string, any>> {
    const keys = await this.keys();
    const data: Record<string, any> = {};

    for (const key of keys) {
      data[key] = await this.getItem(key);
    }

    return data;
  }

  async exportData(): Promise<string> {
    const data = await this.getAllData();
    return JSON.stringify({
      data,
      exportDate: new Date().toISOString(),
      version: await this.getDataVersion()
    }, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const { data, version } = JSON.parse(jsonData);
      
      // Clear existing data
      await this.clear();
      
      // Import new data
      for (const [key, value] of Object.entries(data)) {
        await this.setItem(key, value);
      }
      
      // Update data version if provided
      if (version) {
        await this.setDataVersion(version);
      }
      
      await this.updateLastBackupTime();
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Invalid backup file format');
    }
  }

  async getStorageSize(): Promise<number> {
    const data = await this.getAllData();
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  async cleanupOldData(): Promise<void> {
    // This can be extended to clean up old sessions or temporary data
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Example: Clean up sessions older than 1 week
    const sessions = await this.getCurrentSession();
    if (sessions && sessions.timestamp && sessions.timestamp < oneWeekAgo) {
      await this.clearCurrentSession();
    }
  }
}

// ✅ Create instance
const storageService = new StorageService();

// ✅ Initialize only in browser
if (typeof window !== 'undefined') {
  storageService.initialize().catch(console.error);
}

// ✅ Export default singleton
export default storageService;

// Also export as named export for backward compatibility
export { storageService };

export const getApiKey = storageService.getApiKey.bind(storageService);
export const saveApiKey = storageService.saveApiKey.bind(storageService);
