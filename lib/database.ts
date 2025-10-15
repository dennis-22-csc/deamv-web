// lib/database.ts
import localforage from 'localforage';

// Configure localForage
localforage.config({
  name: 'DeamV',
  version: 1.0,
  storeName: 'deamv_storage',
  description: 'DeamV Practice App Database'
});

// =========================================================================
// TYPES
// =========================================================================

export interface DataScienceChallenge {
  id: string;
  instruction: string;
  solution: string;
  category: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
  updatedAt: Date;
}

export interface PracticeSession {
  id: string;
  category: string;
  challenges: string[]; // challenge IDs
  completed: string[]; // completed challenge IDs
  currentIndex: number;
  score: number;
  startTime: Date;
  endTime?: Date;
  isCompleted: boolean;
}

export interface UserProgress {
  userId: string;
  completedChallenges: string[];
  scores: { [challengeId: string]: number };
  totalPracticeTime: number;
  categories: {
    [category: string]: {
      completed: number;
      total: number;
      averageScore: number;
      lastPracticed: Date;
    }
  };
}

export interface AppSettings {
  apiKey?: string;
  theme: 'light' | 'dark' | 'system';
  ttsEnabled: boolean;
  ttsRate: number;
  ttsPitch: number;
  autoPlayInstructions: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
}

// --- NEW TYPES for Practice Logging ---

export interface ChallengeAttempt {
  challengeId: string;
  isCorrect: boolean; // Was the *final* attempt correct?
  trials: number; // Total number of submission attempts for this challenge
  gotOnFirstTrial: boolean;
  showAnswerClicked: boolean; // Did the user click "Show Answer" or use the equivalent phrase?
  timeSpentSeconds: number; // Time spent on this specific challenge
  timestamp: Date; // Added missing timestamp property
  incorrectAttempts: {
    code: string; // The code submitted for the incorrect trial
    feedback: string;
    timestamp: Date;
  }[];
}

export interface PracticeDataPayload {
  sessionId: string;
  registrationCode: string | null; // User's code for tracking
  category: string;
  startTime: Date;
  endTime: Date;
  totalChallenges: number;
  // Summary Stats
  totalTimeSeconds: number;
  totalQuestionsCompleted: number;
  totalDontKnows: number;
  totalFirstTrialSuccess: number;
  // Detailed Data
  attempts: ChallengeAttempt[];
}

export interface PendingUpload {
  id: string;
  payload: PracticeDataPayload;
  attempts: number;
  lastAttempt: Date;
  status: 'PENDING' | 'FAILED';
}

// =========================================================================
// DATABASE KEYS
// =========================================================================

const DB_KEYS = {
  CHALLENGES: 'data_science_challenges',
  SESSIONS: 'practice_sessions',
  USER_PROGRESS: 'user_progress',
  SETTINGS: 'app_settings',
  CATEGORIES: 'available_categories',
  LAST_SYNC: 'last_sync_time',
  // NEW KEY for failed uploads
  PENDING_UPLOADS: 'pending_practice_uploads',
} as const;

// =========================================================================
// DATABASE HELPER CLASS
// =========================================================================

class PracticeDatabase {
  // ===== CHALLENGE OPERATIONS =====

  async addDataScienceChallenge(
    instruction: string, 
    solution: string, 
    category: string = 'General'
  ): Promise<string> {
    try {
      const challenges = await this.getDataScienceChallenges();
      const newChallenge: DataScienceChallenge = {
        id: this.generateId(),
        instruction: instruction.trim(),
        solution: solution.trim(),
        category: category.trim() || 'General',
        difficulty: this.estimateDifficulty(instruction, solution),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      challenges.push(newChallenge);
      await localforage.setItem(DB_KEYS.CHALLENGES, challenges);
      
      // Update categories cache
      await this.updateCategoriesCache();
      
      return newChallenge.id;
    } catch (error) {
      console.error('Error adding challenge:', error);
      throw new Error('Failed to add challenge to database');
    }
  }


  async getDataScienceChallengesByCategory(category: string, count?: number): Promise<DataScienceChallenge[]> {
    try {
      const allChallenges = await this.getDataScienceChallenges();
      
      let filteredChallenges: DataScienceChallenge[];

      if (category === 'General') {
        filteredChallenges = allChallenges;
      } else {
        filteredChallenges = allChallenges.filter(challenge => 
          challenge.category.toLowerCase() === category.toLowerCase()
        );
      }
      
      // If count is provided, shuffle and slice the array
      if (count !== undefined && count > 0) {
        // Fisher-Yates (Knuth) Shuffle for randomness
        for (let i = filteredChallenges.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [filteredChallenges[i], filteredChallenges[j]] = [filteredChallenges[j], filteredChallenges[i]];
        }
        return filteredChallenges.slice(0, count);
      }

      // If no count, return all filtered challenges (no specific order)
      return filteredChallenges;

    } catch (error) {
      console.error('Error getting challenges by category:', error);
      return [];
    }
  }

  async getDataScienceChallenges(): Promise<DataScienceChallenge[]> {
    try {
      const challenges = await localforage.getItem<DataScienceChallenge[]>(DB_KEYS.CHALLENGES);
      return challenges || [];
    } catch (error) {
      console.error('Error getting challenges:', error);
      return [];
    }
  }

  async getChallengeById(id: string): Promise<DataScienceChallenge | null> {
    try {
      const challenges = await this.getDataScienceChallenges();
      return challenges.find(challenge => challenge.id === id) || null;
    } catch (error) {
      console.error('Error getting challenge by ID:', error);
      return null;
    }
  }

  async updateChallenge(
    id: string, 
    updates: Partial<DataScienceChallenge>
  ): Promise<boolean> {
    try {
      const challenges = await this.getDataScienceChallenges();
      const index = challenges.findIndex(challenge => challenge.id === id);
      
      if (index === -1) return false;
      
      challenges[index] = {
        ...challenges[index],
        ...updates,
        updatedAt: new Date()
      };
      
      await localforage.setItem(DB_KEYS.CHALLENGES, challenges);
      return true;
    } catch (error) {
      console.error('Error updating challenge:', error);
      return false;
    }
  }

  async deleteChallenge(id: string): Promise<boolean> {
    try {
      const challenges = await this.getDataScienceChallenges();
      const filteredChallenges = challenges.filter(challenge => challenge.id !== id);
      
      await localforage.setItem(DB_KEYS.CHALLENGES, filteredChallenges);
      
      // Update categories cache
      await this.updateCategoriesCache();
      
      return true;
    } catch (error) {
      console.error('Error deleting challenge:', error);
      return false;
    }
  }

  async clearDataScienceChallenges(): Promise<void> {
    try {
      await localforage.removeItem(DB_KEYS.CHALLENGES);
      await localforage.removeItem(DB_KEYS.CATEGORIES);
    } catch (error) {
      console.error('Error clearing challenges:', error);
      throw error;
    }
  }

  // ===== CATEGORY OPERATIONS =====

  async getAllCategories(): Promise<string[]> {
    try {
      const cachedCategories = await localforage.getItem<string[]>(DB_KEYS.CATEGORIES);
      if (cachedCategories) {
        return cachedCategories;
      }
      
      return await this.updateCategoriesCache();
    } catch (error) {
      console.error('Error getting categories:', error);
      return ['General'];
    }
  }

  async getChallengesByDifficulty(difficulty: string): Promise<DataScienceChallenge[]> {
    try {
      const challenges = await this.getDataScienceChallenges();
      return challenges.filter(challenge => 
        challenge.difficulty === difficulty
      );
    } catch (error) {
      console.error('Error getting challenges by difficulty:', error);
      return [];
    }
  }

  private async updateCategoriesCache(): Promise<string[]> {
    try {
      const challenges = await this.getDataScienceChallenges();
      const categories = [...new Set(challenges.map(challenge => challenge.category))];
      const uniqueCategories = categories.filter(category => category && category !== 'General');
      
      // Always include 'General' as the first category
      const allCategories = ['General', ...uniqueCategories];
      
      await localforage.setItem(DB_KEYS.CATEGORIES, allCategories);
      return allCategories;
    } catch (error) {
      console.error('Error updating categories cache:', error);
      return ['General'];
    }
  }

  // ===== PROGRESS OPERATIONS (Existing logic retained) =====

  async getUserProgress(): Promise<UserProgress> {
    try {
      const progress = await localforage.getItem<UserProgress>(DB_KEYS.USER_PROGRESS);
      
      if (!progress) {
        // Initialize default progress
        const defaultProgress: UserProgress = {
          userId: 'default',
          completedChallenges: [],
          scores: {},
          totalPracticeTime: 0,
          categories: {}
        };
        
        await this.saveUserProgress(defaultProgress);
        return defaultProgress;
      }
      
      return progress;
    } catch (error) {
      console.error('Error getting user progress:', error);
      // Return default progress on error
      return {
        userId: 'default',
        completedChallenges: [],
        scores: {},
        totalPracticeTime: 0,
        categories: {}
      };
    }
  }

  async saveUserProgress(progress: UserProgress): Promise<void> {
    try {
      await localforage.setItem(DB_KEYS.USER_PROGRESS, progress);
    } catch (error) {
      console.error('Error saving user progress:', error);
      throw error;
    }
  }

  async updateChallengeProgress(
    challengeId: string, 
    score: number, 
    timeSpent: number
  ): Promise<void> {
    try {
      const progress = await this.getUserProgress();
      const challenge = await this.getChallengeById(challengeId);
      
      if (!challenge) return;
      
      // Update completed challenges
      if (!progress.completedChallenges.includes(challengeId)) {
        progress.completedChallenges.push(challengeId);
      }
      
      // Update score
      progress.scores[challengeId] = score;
      
      // Update practice time
      progress.totalPracticeTime += timeSpent;
      
      // Update category progress
      const category = challenge.category;
      if (!progress.categories[category]) {
        progress.categories[category] = {
          completed: 0,
          total: 0,
          averageScore: 0,
          lastPracticed: new Date()
        };
      }
      
      const categoryStats = progress.categories[category];
      
      // PERFORMANCE NOTE: This is an expensive operation as it requires
      // multiple async calls inside a loop. For a full fix, this section
      // would need to be rewritten to pre-fetch all challenges.
      // For now, we'll keep the logic but wrap it in an IIFE to use await.
      await (async () => {
        const allChallenges = await this.getDataScienceChallenges();

        const completedChallengesDetails = progress.completedChallenges
          .map(id => allChallenges.find(c => c.id === id))
          .filter((c): c is DataScienceChallenge => c !== undefined);

        categoryStats.completed = completedChallengesDetails.filter(c => c.category === category).length;
        
        categoryStats.total = (await this.getDataScienceChallengesByCategory(category)).length;

        // Calculate average score for category
        const categoryScores = Object.entries(progress.scores)
          .filter(([id]) => {
            const c = allChallenges.find(c => c.id === id);
            return c?.category === category;
          })
          .map(([, score]) => score);
        
        categoryStats.averageScore = categoryScores.length > 0 
          ? categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length
          : 0;
      })(); // Immediately invoke the async function
      
      categoryStats.lastPracticed = new Date();
      
      await this.saveUserProgress(progress);
    } catch (error) {
      console.error('Error updating challenge progress:', error);
      // Ignoring throw error here for now to match provided code style
    }
  }

  async getCategoryProgress(category: string) {
    const progress = await this.getUserProgress();
    return progress.categories[category] || {
      completed: 0,
      total: 0,
      averageScore: 0,
      lastPracticed: new Date()
    };
  }

  // ===== SESSION OPERATIONS (Existing logic retained) =====

  async createPracticeSession(category: string, challengeIds: string[]): Promise<string> {
    try {
      const sessions = await this.getPracticeSessions();
      const newSession: PracticeSession = {
        id: this.generateId(),
        category,
        challenges: challengeIds,
        completed: [],
        currentIndex: 0,
        score: 0,
        startTime: new Date(),
        isCompleted: false
      };
      
      sessions.push(newSession);
      await localforage.setItem(DB_KEYS.SESSIONS, sessions);
      
      return newSession.id;
    } catch (error) {
      console.error('Error creating practice session:', error);
      throw error;
    }
  }

  async getPracticeSessions(): Promise<PracticeSession[]> {
    try {
      const sessions = await localforage.getItem<PracticeSession[]>(DB_KEYS.SESSIONS);
      return sessions || [];
    } catch (error) {
      console.error('Error getting practice sessions:', error);
      return [];
    }
  }

  async getSessionById(id: string): Promise<PracticeSession | null> {
    try {
      const sessions = await this.getPracticeSessions();
      return sessions.find(session => session.id === id) || null;
    } catch (error) {
      console.error('Error getting session by ID:', error);
      return null;
    }
  }

  async updateSessionProgress(
    sessionId: string, 
    completedChallengeId: string, 
    score: number
  ): Promise<void> {
    try {
      const sessions = await this.getPracticeSessions();
      const sessionIndex = sessions.findIndex(session => session.id === sessionId);
      
      if (sessionIndex === -1) return;
      
      const session = sessions[sessionIndex];
      
      // Update completed challenges
      if (!session.completed.includes(completedChallengeId)) {
        session.completed.push(completedChallengeId);
      }
      
      // Update score
      session.score += score;
      session.currentIndex++;
      
      // Check if session is completed
      if (session.currentIndex >= session.challenges.length) {
        session.isCompleted = true;
        session.endTime = new Date();
      }
      
      await localforage.setItem(DB_KEYS.SESSIONS, sessions);
    } catch (error) {
      console.error('Error updating session progress:', error);
      throw error;
    }
  }

  // ===== SETTINGS OPERATIONS (Existing logic retained) =====

  async getAppSettings(): Promise<AppSettings> {
    try {
      const settings = await localforage.getItem<AppSettings>(DB_KEYS.SETTINGS);
      
      if (!settings) {
        // Return default settings
        const defaultSettings: AppSettings = {
          theme: 'system',
          ttsEnabled: true,
          ttsRate: 1.0,
          ttsPitch: 1.0,
          autoPlayInstructions: true,
          difficulty: 'all'
        };
        
        await this.saveAppSettings(defaultSettings);
        return defaultSettings;
      }
      
      return settings;
    } catch (error) {
      console.error('Error getting app settings:', error);
      // Return default settings on error
      return {
        theme: 'system',
        ttsEnabled: true,
        ttsRate: 1.0,
        ttsPitch: 1.0,
        autoPlayInstructions: true,
        difficulty: 'all'
      };
    }
  }

  async saveAppSettings(settings: AppSettings): Promise<void> {
    try {
      await localforage.setItem(DB_KEYS.SETTINGS, settings);
    } catch (error) {
      console.error('Error saving app settings:', error);
      throw error;
    }
  }

  async updateApiKey(apiKey: string): Promise<void> {
    try {
      const settings = await this.getAppSettings();
      settings.apiKey = apiKey;
      await this.saveAppSettings(settings);
    } catch (error) {
      console.error('Error updating API key:', error);
      throw error;
    }
  }

  // ===== PENDING UPLOADS OPERATIONS (NEW) =====

  async getPendingUploads(): Promise<PendingUpload[]> {
      try {
          const uploads = await localforage.getItem<PendingUpload[]>(DB_KEYS.PENDING_UPLOADS);
          return uploads || [];
      } catch (error) {
          console.error('Error getting pending uploads:', error);
          return [];
      }
  }

  async addPendingUpload(payload: PracticeDataPayload): Promise<void> {
      try {
          const uploads = await this.getPendingUploads();
          const newUpload: PendingUpload = {
              id: this.generateId(),
              payload,
              attempts: 0,
              lastAttempt: new Date(),
              status: 'PENDING',
          };
          uploads.push(newUpload);
          await localforage.setItem(DB_KEYS.PENDING_UPLOADS, uploads);
      } catch (error) {
          console.error('Error adding pending upload:', error);
          throw error;
      }
  }

  async updatePendingUpload(upload: PendingUpload): Promise<void> {
      try {
          let uploads = await this.getPendingUploads();
          const index = uploads.findIndex(u => u.id === upload.id);
          
          if (index !== -1) {
              uploads[index] = upload;
          } else {
              uploads.push(upload); // Should not happen, but safe to add
          }

          await localforage.setItem(DB_KEYS.PENDING_UPLOADS, uploads);
      } catch (error) {
          console.error('Error updating pending upload:', error);
          throw error;
      }
  }

  async removePendingUpload(id: string): Promise<void> {
      try {
          let uploads = await this.getPendingUploads();
          uploads = uploads.filter(u => u.id !== id);
          await localforage.setItem(DB_KEYS.PENDING_UPLOADS, uploads);
      } catch (error) {
          console.error('Error removing pending upload:', error);
          throw error;
      }
  }

  // ===== UTILITY METHODS (Existing logic retained) =====

  async hasDataScienceChallenges(): Promise<boolean> {
    try {
      const challenges = await this.getDataScienceChallenges();
      return challenges.length > 0;
    } catch (error) {
      console.error('Error checking for challenges:', error);
      return false;
    }
  }

  async getChallengeCount(): Promise<number> {
    try {
      const challenges = await this.getDataScienceChallenges();
      return challenges.length;
    } catch (error) {
      console.error('Error getting challenge count:', error);
      return 0;
    }
  }

  async getRandomChallenges(count: number, category?: string): Promise<DataScienceChallenge[]> {
    try {
      let challenges = await this.getDataScienceChallenges();
      
      if (category && category !== 'General') {
        challenges = challenges.filter(challenge => 
          challenge.category.toLowerCase() === category.toLowerCase()
        );
      }
      
      // Shuffle and take requested number
      const shuffled = [...challenges].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    } catch (error) {
      console.error('Error getting random challenges:', error);
      return [];
    }
  }

  async searchChallenges(query: string): Promise<DataScienceChallenge[]> {
    try {
      const challenges = await this.getDataScienceChallenges();
      const lowerQuery = query.toLowerCase();
      
      return challenges.filter(challenge =>
        challenge.instruction.toLowerCase().includes(lowerQuery) ||
        challenge.category.toLowerCase().includes(lowerQuery) ||
        challenge.difficulty?.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching challenges:', error);
      return [];
    }
  }

  // ===== PRIVATE METHODS (Existing logic retained) =====

  private generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private estimateDifficulty(instruction: string, solution: string): DataScienceChallenge['difficulty'] {
    const instructionLength = instruction.length;
    const solutionLength = solution.length;
    const codeComplexity = (solution.match(/def |class |import |for |while |if /g) || []).length;
    
    const complexityScore = instructionLength * 0.1 + solutionLength * 0.2 + codeComplexity * 10;
    
    if (complexityScore < 50) return 'beginner';
    if (complexityScore < 150) return 'intermediate';
    return 'advanced';
  }

  // ===== DATA EXPORT/IMPORT (Existing logic retained) =====

  async exportData(): Promise<string> {
    try {
      const data = {
        challenges: await this.getDataScienceChallenges(),
        progress: await this.getUserProgress(),
        settings: await this.getAppSettings(),
        sessions: await this.getPracticeSessions(),
        uploads: await this.getPendingUploads(), // Include pending uploads in export
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.challenges) {
        await localforage.setItem(DB_KEYS.CHALLENGES, data.challenges);
      }
      
      if (data.progress) {
        await localforage.setItem(DB_KEYS.USER_PROGRESS, data.progress);
      }
      
      if (data.settings) {
        await localforage.setItem(DB_KEYS.SETTINGS, data.settings);
      }
      
      if (data.sessions) {
        await localforage.setItem(DB_KEYS.SESSIONS, data.sessions);
      }

      if (data.uploads) { // Handle importing pending uploads
        await localforage.setItem(DB_KEYS.PENDING_UPLOADS, data.uploads);
      }
      
      // Update categories cache
      await this.updateCategoriesCache();
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  // ===== DATABASE MAINTENANCE (Existing logic retained) =====

  async clearAllData(): Promise<void> {
    try {
      await localforage.clear();
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  async getDatabaseSize(): Promise<number> {
    try {
      let totalSize = 0;
      
      const keys = await localforage.keys();
      for (const key of keys) {
        const item = await localforage.getItem(key);
        totalSize += new Blob([JSON.stringify(item)]).size;
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error getting database size:', error);
      return 0;
    }
  }
}


// Create and export a singleton instance
export const practiceDatabase = new PracticeDatabase();
