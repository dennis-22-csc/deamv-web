// types/challenge.ts - TypeScript interfaces for data structures

// Base challenge interface
export interface BaseChallenge {
  id: string;
  instruction: string;
  solution: string;
  category: string;
  difficulty?: ChallengeDifficulty;
  estimatedTime?: number; // in minutes
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Data Science specific challenge
export interface DataScienceChallenge extends BaseChallenge {
  language?: 'python' | 'r' | 'sql';
  libraries?: string[];
  testCases?: TestCase[];
  hints?: string[];
  explanation?: string;
}

// Test case for code validation
export interface TestCase {
  input: string;
  expectedOutput: string;
  description?: string;
}

// Challenge difficulty levels
export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced';

// Practice session interface
export interface PracticeSession {
  id: string;
  userId: string;
  category: string;
  challenges: string[]; // challenge IDs
  completed: string[]; // completed challenge IDs
  currentIndex: number;
  score: number;
  startTime: Date;
  endTime?: Date;
  isCompleted: boolean;
  settings: SessionSettings;
  statistics: SessionStatistics;
}

// Session settings
export interface SessionSettings {
  ttsEnabled: boolean;
  autoPlayInstructions: boolean;
  showHints: boolean;
  difficulty: ChallengeDifficulty | 'all';
  challengeCount: number;
  timeLimit?: number; // in minutes
}

// Session statistics
export interface SessionStatistics {
  totalChallenges: number;
  completedChallenges: number;
  correctAnswers: number;
  averageTimePerChallenge: number;
  totalTime: number;
  streak: number;
}

// User progress and analytics
export interface UserProgress {
  userId: string;
  completedChallenges: string[];
  scores: { [challengeId: string]: number };
  totalPracticeTime: number;
  categories: {
    [category: string]: CategoryProgress;
  };
  achievements: Achievement[];
  preferences: UserPreferences;
}

// Category-specific progress
export interface CategoryProgress {
  completed: number;
  total: number;
  averageScore: number;
  lastPracticed: Date;
  bestStreak: number;
  timeSpent: number;
}

// User preferences
export interface UserPreferences {
  theme: AppTheme;
  ttsEnabled: boolean;
  ttsRate: number;
  ttsPitch: number;
  autoPlayInstructions: boolean;
  codeEditorTheme: string;
  fontSize: number;
  difficulty: ChallengeDifficulty | 'all';
  notifications: NotificationSettings;
}

// Application theme
export type AppTheme = 'light' | 'dark' | 'system';

// Notification settings
export interface NotificationSettings {
  enabled: boolean;
  practiceReminders: boolean;
  achievementAlerts: boolean;
  dailyGoals: boolean;
  schedule: NotificationSchedule;
}

// Notification schedule
export interface NotificationSchedule {
  enabled: boolean;
  time: string; // HH:MM format
  days: number[]; // 0-6 (Sunday-Saturday)
}

// Achievement system
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
  type: AchievementType;
  category?: string;
}

// Achievement types
export type AchievementType = 
  | 'completion' 
  | 'streak' 
  | 'speed' 
  | 'accuracy' 
  | 'mastery' 
  | 'special';

// API evaluation response
export interface EvaluationResponse {
  success: boolean;
  feedback: string;
  isCorrect: boolean;
  score?: number;
  suggestions?: string[];
  errors?: string[];
  confidence?: number;
  executionResult?: ExecutionResult;
}

// Code execution result
export interface ExecutionResult {
  output?: string;
  error?: string;
  executionTime?: number;
  memoryUsed?: number;
  passedTests?: number;
  totalTests?: number;
}

// File processing results
export interface FileProcessingResult {
  success: boolean;
  message: string;
  totalProcessed: number;
  totalFailed: number;
  categoriesFound: string[];
  errors: string[];
  warnings: string[];
  processingTime: number;
}

// Category information
export interface CategoryInfo {
  name: string;
  description: string;
  challengeCount: number;
  difficulty: ChallengeDifficulty;
  icon?: string;
  color?: string;
  lastPracticed?: Date;
  progress?: number;
}

// Practice statistics
export interface PracticeStatistics {
  totalSessions: number;
  totalPracticeTime: number;
  totalChallengesCompleted: number;
  averageScore: number;
  currentStreak: number;
  bestStreak: number;
  favoriteCategory: string;
  challengesByDifficulty: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  dailyProgress: DailyProgress[];
}

// Daily progress tracking
export interface DailyProgress {
  date: string; // YYYY-MM-DD
  challengesCompleted: number;
  practiceTime: number;
  score: number;
}

// Code evaluation request
export interface EvaluationRequest {
  instruction: string;
  userCode: string;
  expectedSolution: string;
  language?: string;
  context?: string;
  testCases?: TestCase[];
}

// AI model configuration
export interface AIModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
}

// App settings
export interface AppSettings {
  apiKey?: string;
  theme: AppTheme;
  ttsEnabled: boolean;
  ttsRate: number;
  ttsPitch: number;
  autoPlayInstructions: boolean;
  difficulty: ChallengeDifficulty | 'all';
  codeEditor: CodeEditorSettings;
  notifications: NotificationSettings;
  data: DataSettings;
}

// Code editor settings
export interface CodeEditorSettings {
  theme: string;
  fontSize: number;
  showLineNumbers: boolean;
  wordWrap: boolean;
  tabSize: number;
  autoComplete: boolean;
}

// Data management settings
export interface DataSettings {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  cloudSync: boolean;
  exportFormat: 'json' | 'csv';
}

// Navigation state
export interface NavigationState {
  currentRoute: string;
  previousRoute?: string;
  params: Record<string, any>;
  history: string[];
}

// Toast notification
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: ToastAction;
}

// Toast action
export interface ToastAction {
  label: string;
  onClick: () => void;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  type?: 'indeterminate' | 'determinate';
}

// Error state
export interface ErrorState {
  hasError: boolean;
  message: string;
  code?: string;
  details?: any;
  retryable: boolean;
}

// Pagination info
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Search and filter options
export interface SearchFilters {
  query: string;
  categories: string[];
  difficulties: ChallengeDifficulty[];
  tags: string[];
  status: 'all' | 'completed' | 'incomplete';
  sortBy: 'difficulty' | 'category' | 'date' | 'name';
  sortOrder: 'asc' | 'desc';
}

// Export/Import data structure
export interface AppDataExport {
  version: string;
  exportDate: string;
  challenges: DataScienceChallenge[];
  progress: UserProgress;
  settings: AppSettings;
  sessions: PracticeSession[];
  achievements: Achievement[];
}

// Type guards for runtime type checking
export const isDataScienceChallenge = (challenge: any): challenge is DataScienceChallenge => {
  return challenge && 
         typeof challenge.instruction === 'string' &&
         typeof challenge.solution === 'string' &&
         typeof challenge.category === 'string';
};

export const isPracticeSession = (session: any): session is PracticeSession => {
  return session &&
         typeof session.id === 'string' &&
         Array.isArray(session.challenges) &&
         typeof session.currentIndex === 'number';
};

export const isUserProgress = (progress: any): progress is UserProgress => {
  return progress &&
         typeof progress.userId === 'string' &&
         Array.isArray(progress.completedChallenges) &&
         typeof progress.totalPracticeTime === 'number';
};

// Utility types for component props
export type WithId<T> = T & { id: string };
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Require<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Event types for analytics
export interface AnalyticsEvent {
  name: string;
  timestamp: Date;
  properties: Record<string, any>;
  userId: string;
  sessionId: string;
}

// Specific analytics events
export interface ChallengeCompletedEvent extends AnalyticsEvent {
  name: 'challenge_completed';
  properties: {
    challengeId: string;
    category: string;
    difficulty: ChallengeDifficulty;
    score: number;
    timeSpent: number;
    attempts: number;
  };
}

export interface PracticeSessionEvent extends AnalyticsEvent {
  name: 'practice_session';
  properties: {
    sessionId: string;
    category: string;
    challengeCount: number;
    completedCount: number;
    totalTime: number;
    averageScore: number;
  };
}

export interface AchievementUnlockedEvent extends AnalyticsEvent {
  name: 'achievement_unlocked';
  properties: {
    achievementId: string;
    title: string;
    type: AchievementType;
  };
}
