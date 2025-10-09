// contexts/PracticeContext.tsx - Practice session state management
'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { 
  PracticeSession, 
  DataScienceChallenge, 
  EvaluationResponse,
  ChallengeDifficulty,
  SessionSettings,
  SessionStatistics
} from '@/types/challenge';
import { useApp } from './AppContext';
import { practiceDatabase } from '@/lib/database';
import { evaluateCodeWithGemini, mockEvaluateCode } from '@/lib/api';

// Practice session state
interface PracticeState {
  // Current session
  currentSession: PracticeSession | null;
  
  // Challenge data
  currentChallenge: DataScienceChallenge | null;
  currentChallengeIndex: number;
  challenges: DataScienceChallenge[];
  
  // User input and evaluation
  userCode: string;
  feedback: EvaluationResponse | null;
  isEvaluating: boolean;
  
  // Session flow
  isShowingSampleAnswer: boolean;
  isSessionCompleted: boolean;
  sessionStartTime: Date | null;
  
  // TTS state
  isTtsEnabled: boolean;
  isSpeaking: boolean;
  
  // Navigation
  canGoBack: boolean;
  canGoForward: boolean;
}

// Action types
type PracticeAction =
  // Session management
  | { type: 'START_SESSION'; payload: { challenges: DataScienceChallenge[]; category: string; settings: SessionSettings } }
  | { type: 'END_SESSION' }
  | { type: 'RESUME_SESSION'; payload: PracticeSession }
  | { type: 'SAVE_SESSION_PROGRESS' }
  
  // Challenge navigation
  | { type: 'NEXT_CHALLENGE' }
  | { type: 'PREVIOUS_CHALLENGE' }
  | { type: 'GO_TO_CHALLENGE'; payload: number }
  | { type: 'SKIP_CHALLENGE' }
  
  // User input
  | { type: 'UPDATE_USER_CODE'; payload: string }
  | { type: 'CLEAR_USER_CODE' }
  | { type: 'SET_SAMPLE_ANSWER'; payload: boolean }
  
  // Evaluation
  | { type: 'START_EVALUATION' }
  | { type: 'EVALUATION_SUCCESS'; payload: EvaluationResponse }
  | { type: 'EVALUATION_ERROR'; payload: string }
  | { type: 'CLEAR_FEEDBACK' }
  
  // TTS control
  | { type: 'TOGGLE_TTS' }
  | { type: 'SET_TTS_ENABLED'; payload: boolean }
  | { type: 'SET_SPEAKING'; payload: boolean }
  
  // Session state
  | { type: 'MARK_CHALLENGE_COMPLETED'; payload: { challengeId: string; score: number; timeSpent: number } }
  | { type: 'UPDATE_SESSION_STATS'; payload: Partial<SessionStatistics> }
  | { type: 'COMPLETE_SESSION' };

// Initial state
const initialState: PracticeState = {
  currentSession: null,
  currentChallenge: null,
  currentChallengeIndex: 0,
  challenges: [],
  userCode: '',
  feedback: null,
  isEvaluating: false,
  isShowingSampleAnswer: false,
  isSessionCompleted: false,
  sessionStartTime: null,
  isTtsEnabled: true,
  isSpeaking: false,
  canGoBack: false,
  canGoForward: true
};

// Reducer function
function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    // Session management
    case 'START_SESSION': {
      const { challenges, category, settings } = action.payload;
      const challengeIds = challenges.map(c => c.id);
      
      const newSession: PracticeSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: 'default',
        category,
        challenges: challengeIds,
        completed: [],
        currentIndex: 0,
        score: 0,
        startTime: new Date(),
        isCompleted: false,
        settings,
        statistics: {
          totalChallenges: challenges.length,
          completedChallenges: 0,
          correctAnswers: 0,
          averageTimePerChallenge: 0,
          totalTime: 0,
          streak: 0
        }
      };
      
      return {
        ...initialState,
        currentSession: newSession,
        currentChallenge: challenges[0],
        challenges,
        sessionStartTime: new Date(),
        isTtsEnabled: settings.ttsEnabled
      };
    }
    
    case 'END_SESSION':
      return {
        ...initialState
      };
      
    case 'RESUME_SESSION': {
      const session = action.payload;
      // In a real app, you would load the challenges by their IDs
      // For now, we'll assume challenges are already loaded
      return {
        ...state,
        currentSession: session,
        currentChallengeIndex: session.currentIndex,
        // currentChallenge would be set based on session.currentIndex
      };
    }
    
    // Challenge navigation
    case 'NEXT_CHALLENGE': {
      if (!state.currentSession || state.currentChallengeIndex >= state.challenges.length - 1) {
        return state;
      }
      
      const nextIndex = state.currentChallengeIndex + 1;
      const nextChallenge = state.challenges[nextIndex];
      
      return {
        ...state,
        currentChallengeIndex: nextIndex,
        currentChallenge: nextChallenge,
        userCode: '',
        feedback: null,
        isShowingSampleAnswer: false,
        canGoBack: nextIndex > 0,
        canGoForward: nextIndex < state.challenges.length - 1
      };
    }
    
    case 'PREVIOUS_CHALLENGE': {
      if (!state.currentSession || state.currentChallengeIndex <= 0) {
        return state;
      }
      
      const prevIndex = state.currentChallengeIndex - 1;
      const prevChallenge = state.challenges[prevIndex];
      
      return {
        ...state,
        currentChallengeIndex: prevIndex,
        currentChallenge: prevChallenge,
        userCode: '',
        feedback: null,
        isShowingSampleAnswer: false,
        canGoBack: prevIndex > 0,
        canGoForward: prevIndex < state.challenges.length - 1
      };
    }
    
    case 'GO_TO_CHALLENGE': {
      const index = action.payload;
      if (!state.currentSession || index < 0 || index >= state.challenges.length) {
        return state;
      }
      
      const challenge = state.challenges[index];
      
      return {
        ...state,
        currentChallengeIndex: index,
        currentChallenge: challenge,
        userCode: '',
        feedback: null,
        isShowingSampleAnswer: false,
        canGoBack: index > 0,
        canGoForward: index < state.challenges.length - 1
      };
    }
    
    case 'SKIP_CHALLENGE': {
      if (!state.currentSession) return state;
      
      // Mark as completed with 0 score
      const updatedSession = {
        ...state.currentSession,
        completed: [...state.currentSession.completed, state.currentChallenge!.id],
        currentIndex: state.currentChallengeIndex + 1
      };
      
      const nextIndex = state.currentChallengeIndex + 1;
      const isSessionComplete = nextIndex >= state.challenges.length;
      
      return {
        ...state,
        currentSession: updatedSession,
        currentChallengeIndex: nextIndex,
        currentChallenge: isSessionComplete ? null : state.challenges[nextIndex],
        userCode: '',
        feedback: null,
        isShowingSampleAnswer: false,
        isSessionCompleted: isSessionComplete,
        canGoBack: nextIndex > 0,
        canGoForward: !isSessionComplete && nextIndex < state.challenges.length - 1
      };
    }
    
    // User input
    case 'UPDATE_USER_CODE':
      return {
        ...state,
        userCode: action.payload
      };
      
    case 'CLEAR_USER_CODE':
      return {
        ...state,
        userCode: ''
      };
      
    case 'SET_SAMPLE_ANSWER':
      return {
        ...state,
        isShowingSampleAnswer: action.payload
      };
    
    // Evaluation
    case 'START_EVALUATION':
      return {
        ...state,
        isEvaluating: true,
        feedback: null
      };
      
    case 'EVALUATION_SUCCESS':
      return {
        ...state,
        isEvaluating: false,
        feedback: action.payload
      };
      
    case 'EVALUATION_ERROR':
      return {
        ...state,
        isEvaluating: false,
        feedback: {
          success: false,
          feedback: action.payload,
          isCorrect: false,
          errors: [action.payload]
        }
      };
      
    case 'CLEAR_FEEDBACK':
      return {
        ...state,
        feedback: null
      };
    
    // TTS control
    case 'TOGGLE_TTS':
      return {
        ...state,
        isTtsEnabled: !state.isTtsEnabled
      };
      
    case 'SET_TTS_ENABLED':
      return {
        ...state,
        isTtsEnabled: action.payload
      };
      
    case 'SET_SPEAKING':
      return {
        ...state,
        isSpeaking: action.payload
      };
    
    // Session state
    case 'MARK_CHALLENGE_COMPLETED': {
      if (!state.currentSession) return state;
      
      const { challengeId, score, timeSpent } = action.payload;
      const updatedSession = {
        ...state.currentSession,
        completed: [...state.currentSession.completed, challengeId],
        score: state.currentSession.score + score,
        statistics: {
          ...state.currentSession.statistics,
          completedChallenges: state.currentSession.statistics.completedChallenges + 1,
          correctAnswers: state.currentSession.statistics.correctAnswers + (score > 0 ? 1 : 0),
          totalTime: state.currentSession.statistics.totalTime + timeSpent,
          averageTimePerChallenge: (state.currentSession.statistics.totalTime + timeSpent) / 
            (state.currentSession.statistics.completedChallenges + 1),
          streak: score > 0 ? state.currentSession.statistics.streak + 1 : 0
        }
      };
      
      return {
        ...state,
        currentSession: updatedSession
      };
    }
    
    case 'UPDATE_SESSION_STATS': {
      if (!state.currentSession) return state;
      
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          statistics: {
            ...state.currentSession.statistics,
            ...action.payload
          }
        }
      };
    }
    
    case 'COMPLETE_SESSION': {
      if (!state.currentSession) return state;
      
      const completedSession: PracticeSession = {
        ...state.currentSession,
        isCompleted: true,
        endTime: new Date()
      };
      
      return {
        ...state,
        currentSession: completedSession,
        isSessionCompleted: true
      };
    }
    
    default:
      return state;
  }
}

// Context interface
interface PracticeContextType {
  state: PracticeState;
  dispatch: React.Dispatch<PracticeAction>;
  
  // Session management
  startSession: (category: string, challengeCount?: number, difficulty?: ChallengeDifficulty | 'all') => Promise<void>;
  endSession: () => void;
  resumeSession: (sessionId: string) => Promise<void>;
  saveSessionProgress: () => Promise<void>;
  
  // Challenge navigation
  nextChallenge: () => void;
  previousChallenge: () => void;
  goToChallenge: (index: number) => void;
  skipChallenge: () => void;
  
  // User input
  updateUserCode: (code: string) => void;
  clearUserCode: () => void;
  showSampleAnswer: () => void;
  hideSampleAnswer: () => void;
  
  // Evaluation
  evaluateCode: () => Promise<void>;
  clearFeedback: () => void;
  
  // TTS control
  toggleTTS: () => void;
  setTTSEnabled: (enabled: boolean) => void;
  speakInstruction: (text?: string) => void;
  stopSpeaking: () => void;
  
  // Session progress
  markChallengeCompleted: (score: number, timeSpent: number) => void;
  completeSession: () => void;
  
  // Utility methods
  getProgressPercentage: () => number;
  getRemainingTime: () => number | null;
  canSubmitCode: () => boolean;
  getSessionSummary: () => SessionStatistics | null;
}

// Create context
const PracticeContext = createContext<PracticeContextType | undefined>(undefined);

// Provider component
interface PracticeProviderProps {
  children: React.ReactNode;
}

export const PracticeProvider: React.FC<PracticeProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(practiceReducer, initialState);
  const { showToast, completeChallenge, setCurrentSession, state: appState } = useApp();

  // Auto-save session progress when it changes
  useEffect(() => {
    if (state.currentSession && !state.isSessionCompleted) {
      const saveTimer = setTimeout(() => {
        saveSessionProgress().catch(console.error);
      }, 2000); // Debounce saves

      return () => clearTimeout(saveTimer);
    }
  }, [state.currentSession]);

  // Update app context with current session
  useEffect(() => {
    setCurrentSession(state.currentSession?.id || null);
  }, [state.currentSession?.id, setCurrentSession]);

  // Session management
  const startSession = useCallback(async (
    category: string, 
    challengeCount: number = 10,
    difficulty: ChallengeDifficulty | 'all' = 'all'
  ) => {
    try {
      // Show loading
      showToast({
        type: 'info',
        title: 'Starting Session',
        message: 'Loading challenges...',
        duration: 2000
      });

      // Get challenges for the session
      let challenges: DataScienceChallenge[] = [];
      
      if (category === 'General') {
        challenges = await practiceDatabase.getRandomChallenges(challengeCount);
      } else {
        const categoryChallenges = await practiceDatabase.getDataScienceChallengesByCategory(category);
        
        // Filter by difficulty if specified
        if (difficulty !== 'all') {
          challenges = categoryChallenges.filter(c => c.difficulty === difficulty);
        } else {
          challenges = categoryChallenges;
        }
        
        // Shuffle and take requested number
        challenges = challenges
          .sort(() => 0.5 - Math.random())
          .slice(0, challengeCount);
      }

      if (challenges.length === 0) {
        showToast({
          type: 'error',
          title: 'No Challenges',
          message: `No challenges found for ${category}`,
          duration: 5000
        });
        return;
      }

      // Create session settings from app settings
      const settings: SessionSettings = {
        ttsEnabled: appState.settings.ttsEnabled,
        autoPlayInstructions: appState.settings.autoPlayInstructions,
        showHints: true,
        difficulty,
        challengeCount: challenges.length,
        timeLimit: undefined // Optional time limit
      };

      // Start the session
      dispatch({
        type: 'START_SESSION',
        payload: { challenges, category, settings }
      });

      // Speak first instruction if TTS is enabled
      if (settings.ttsEnabled && settings.autoPlayInstructions) {
        setTimeout(() => {
          speakInstruction(challenges[0].instruction);
        }, 1000);
      }

      showToast({
        type: 'success',
        title: 'Session Started',
        message: `Practice session with ${challenges.length} challenges`,
        duration: 3000
      });

    } catch (error) {
      console.error('Failed to start session:', error);
      showToast({
        type: 'error',
        title: 'Session Error',
        message: 'Failed to start practice session',
        duration: 5000
      });
    }
  }, [appState.settings, showToast]);

  const endSession = useCallback(() => {
    if (state.currentSession && !state.isSessionCompleted) {
      showToast({
        type: 'warning',
        title: 'Session Ended',
        message: 'Progress has been saved',
        duration: 3000
      });
    }
    
    dispatch({ type: 'END_SESSION' });
  }, [state.currentSession, state.isSessionCompleted, showToast]);

  const resumeSession = useCallback(async (sessionId: string) => {
    try {
      const session = await practiceDatabase.getSessionById(sessionId);
      if (!session) {
        showToast({
          type: 'error',
          title: 'Session Not Found',
          message: 'Could not resume session',
          duration: 5000
        });
        return;
      }

      // Load challenges for the session
      const challenges: DataScienceChallenge[] = [];
      for (const challengeId of session.challenges) {
        const challenge = await practiceDatabase.getChallengeById(challengeId);
        if (challenge) {
          challenges.push(challenge);
        }
      }

      if (challenges.length === 0) {
        showToast({
          type: 'error',
          title: 'Challenges Not Found',
          message: 'Could not load session challenges',
          duration: 5000
        });
        return;
      }

      // Update state with session and challenges
      dispatch({
        type: 'START_SESSION',
        payload: {
          challenges,
          category: session.category,
          settings: session.settings
        }
      });

      // Restore session progress
      dispatch({ type: 'RESUME_SESSION', payload: session });

      showToast({
        type: 'success',
        title: 'Session Resumed',
        message: `Continuing from challenge ${session.currentIndex + 1}`,
        duration: 3000
      });

    } catch (error) {
      console.error('Failed to resume session:', error);
      showToast({
        type: 'error',
        title: 'Resume Error',
        message: 'Failed to resume practice session',
        duration: 5000
      });
    }
  }, [showToast]);

  const saveSessionProgress = useCallback(async () => {
    if (!state.currentSession) return;

    try {
      await practiceDatabase.updateSessionProgress(
        state.currentSession.id,
        state.currentSession.completed[state.currentSession.completed.length - 1] || '',
        state.currentSession.score
      );
    } catch (error) {
      console.error('Failed to save session progress:', error);
    }
  }, [state.currentSession]);

  // Challenge navigation
  const nextChallenge = useCallback(() => {
    dispatch({ type: 'NEXT_CHALLENGE' });
    
    // Speak next instruction if TTS is enabled
    if (state.isTtsEnabled && state.currentSession?.settings.autoPlayInstructions) {
      const nextIndex = state.currentChallengeIndex + 1;
      if (nextIndex < state.challenges.length) {
        setTimeout(() => {
          speakInstruction(state.challenges[nextIndex].instruction);
        }, 500);
      }
    }
  }, [state.isTtsEnabled, state.currentSession, state.currentChallengeIndex, state.challenges]);

  const previousChallenge = useCallback(() => {
    dispatch({ type: 'PREVIOUS_CHALLENGE' });
  }, []);

  const goToChallenge = useCallback((index: number) => {
    dispatch({ type: 'GO_TO_CHALLENGE', payload: index });
  }, []);

  const skipChallenge = useCallback(() => {
    dispatch({ type: 'SKIP_CHALLENGE' });
    
    // Track skipped challenge
    if (state.currentChallenge) {
      completeChallenge({
        challengeId: state.currentChallenge.id,
        category: state.currentSession?.category || 'General',
        difficulty: state.currentChallenge.difficulty || 'intermediate',
        score: 0,
        timeSpent: 0,
        attempts: 0
      });
    }
  }, [state.currentChallenge, state.currentSession, completeChallenge]);

  // User input
  const updateUserCode = useCallback((code: string) => {
    dispatch({ type: 'UPDATE_USER_CODE', payload: code });
  }, []);

  const clearUserCode = useCallback(() => {
    dispatch({ type: 'CLEAR_USER_CODE' });
  }, []);

  const showSampleAnswer = useCallback(() => {
    dispatch({ type: 'SET_SAMPLE_ANSWER', payload: true });
  }, []);

  const hideSampleAnswer = useCallback(() => {
    dispatch({ type: 'SET_SAMPLE_ANSWER', payload: false });
  }, []);

  // Evaluation
  const evaluateCode = useCallback(async () => {
    if (!state.currentChallenge || !state.userCode.trim()) {
      showToast({
        type: 'warning',
        title: 'No Code',
        message: 'Please write some code first',
        duration: 3000
      });
      return;
    }

    dispatch({ type: 'START_EVALUATION' });

    try {
      let evaluation: EvaluationResponse;

      // Use mock evaluation in development or if no API key
      if (process.env.NODE_ENV === 'development' || !appState.settings.apiKey) {
        evaluation = await mockEvaluateCode(
          state.currentChallenge.instruction,
          state.userCode,
          state.currentChallenge.solution
        );
      } else {
        evaluation = await evaluateCodeWithGemini(
          state.currentChallenge.instruction,
          state.userCode,
          state.currentChallenge.solution,
          appState.settings.apiKey
        );
      }

      dispatch({ type: 'EVALUATION_SUCCESS', payload: evaluation });

      // Mark challenge as completed
      const score = evaluation.isCorrect ? 100 : evaluation.score || 0;
      const timeSpent = state.sessionStartTime ? 
        (Date.now() - state.sessionStartTime.getTime()) / 1000 / 60 : 0; // minutes
      
      markChallengeCompleted(score, timeSpent);

      // Show appropriate toast
      if (evaluation.isCorrect) {
        showToast({
          type: 'success',
          title: 'Correct!',
          message: 'Great job! Moving to next challenge...',
          duration: 3000
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Needs Improvement',
          message: 'Check the feedback and try again',
          duration: 5000
        });
      }

    } catch (error) {
      console.error('Evaluation error:', error);
      dispatch({ 
        type: 'EVALUATION_ERROR', 
        payload: error instanceof Error ? error.message : 'Evaluation failed' 
      });
      
      showToast({
        type: 'error',
        title: 'Evaluation Error',
        message: 'Failed to evaluate code. Please try again.',
        duration: 5000
      });
    }
  }, [
    state.currentChallenge, 
    state.userCode, 
    state.sessionStartTime,
    appState.settings.apiKey, 
    showToast
  ]);

  const clearFeedback = useCallback(() => {
    dispatch({ type: 'CLEAR_FEEDBACK' });
  }, []);

  // TTS control
  const toggleTTS = useCallback(() => {
    dispatch({ type: 'TOGGLE_TTS' });
  }, []);

  const setTTSEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_TTS_ENABLED', payload: enabled });
  }, []);

  const speakInstruction = useCallback((text?: string) => {
    if (!state.isTtsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const speechText = text || state.currentChallenge?.instruction;
    if (!speechText) return;

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = appState.settings.ttsRate;
    utterance.pitch = appState.settings.ttsPitch;
    
    utterance.onstart = () => {
      dispatch({ type: 'SET_SPEAKING', payload: true });
    };
    
    utterance.onend = () => {
      dispatch({ type: 'SET_SPEAKING', payload: false });
    };
    
    utterance.onerror = () => {
      dispatch({ type: 'SET_SPEAKING', payload: false });
    };

    window.speechSynthesis.speak(utterance);
  }, [state.isTtsEnabled, state.currentChallenge, appState.settings.ttsRate, appState.settings.ttsPitch]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      dispatch({ type: 'SET_SPEAKING', payload: false });
    }
  }, []);

  // Session progress
  const markChallengeCompleted = useCallback((score: number, timeSpent: number) => {
    if (!state.currentChallenge) return;

    dispatch({
      type: 'MARK_CHALLENGE_COMPLETED',
      payload: {
        challengeId: state.currentChallenge.id,
        score,
        timeSpent
      }
    });

    // Update global progress
    completeChallenge({
      challengeId: state.currentChallenge.id,
      category: state.currentSession?.category || 'General',
      difficulty: state.currentChallenge.difficulty || 'intermediate',
      score,
      timeSpent,
      attempts: 1 // This could be tracked more precisely
    });
  }, [state.currentChallenge, state.currentSession, completeChallenge]);

  const completeSession = useCallback(() => {
    dispatch({ type: 'COMPLETE_SESSION' });
    
    if (state.currentSession) {
      showToast({
        type: 'success',
        title: 'Session Complete!',
        message: `You completed ${state.currentSession.statistics.completedChallenges} challenges`,
        duration: 5000
      });
    }
  }, [state.currentSession, showToast]);

  // Utility methods
  const getProgressPercentage = useCallback((): number => {
    if (!state.currentSession || state.challenges.length === 0) return 0;
    return (state.currentChallengeIndex / state.challenges.length) * 100;
  }, [state.currentSession, state.currentChallengeIndex, state.challenges.length]);

  const getRemainingTime = useCallback((): number | null => {
    if (!state.currentSession?.settings.timeLimit || !state.sessionStartTime) {
      return null;
    }

    const elapsed = (Date.now() - state.sessionStartTime.getTime()) / 1000 / 60; // minutes
    const remaining = state.currentSession.settings.timeLimit - elapsed;
    return Math.max(0, remaining);
  }, [state.currentSession, state.sessionStartTime]);

  const canSubmitCode = useCallback((): boolean => {
    return !!state.userCode.trim() && !state.isEvaluating;
  }, [state.userCode, state.isEvaluating]);

  const getSessionSummary = useCallback((): SessionStatistics | null => {
    return state.currentSession?.statistics || null;
  }, [state.currentSession]);

  const contextValue: PracticeContextType = {
    state,
    dispatch,
    
    // Session management
    startSession,
    endSession,
    resumeSession,
    saveSessionProgress,
    
    // Challenge navigation
    nextChallenge,
    previousChallenge,
    goToChallenge,
    skipChallenge,
    
    // User input
    updateUserCode,
    clearUserCode,
    showSampleAnswer,
    hideSampleAnswer,
    
    // Evaluation
    evaluateCode,
    clearFeedback,
    
    // TTS control
    toggleTTS,
    setTTSEnabled,
    speakInstruction,
    stopSpeaking,
    
    // Session progress
    markChallengeCompleted,
    completeSession,
    
    // Utility methods
    getProgressPercentage,
    getRemainingTime,
    canSubmitCode,
    getSessionSummary
  };

  return (
    <PracticeContext.Provider value={contextValue}>
      {children}
    </PracticeContext.Provider>
  );
};

// Hook to use the practice context
export const usePractice = (): PracticeContextType => {
  const context = useContext(PracticeContext);
  if (context === undefined) {
    throw new Error('usePractice must be used within a PracticeProvider');
  }
  return context;
};

// Hook for specific practice state slices
export const useCurrentSession = () => {
  const { state, startSession, endSession, completeSession } = usePractice();
  return {
    currentSession: state.currentSession,
    isSessionCompleted: state.isSessionCompleted,
    startSession,
    endSession,
    completeSession
  };
};

export const useCurrentChallenge = () => {
  const { state, nextChallenge, previousChallenge, goToChallenge, skipChallenge } = usePractice();
  return {
    currentChallenge: state.currentChallenge,
    currentChallengeIndex: state.currentChallengeIndex,
    totalChallenges: state.challenges.length,
    nextChallenge,
    previousChallenge,
    goToChallenge,
    skipChallenge
  };
};

export const useCodeEvaluation = () => {
  const { state, evaluateCode, clearFeedback, updateUserCode, clearUserCode } = usePractice();
  return {
    userCode: state.userCode,
    feedback: state.feedback,
    isEvaluating: state.isEvaluating,
    isShowingSampleAnswer: state.isShowingSampleAnswer,
    evaluateCode,
    clearFeedback,
    updateUserCode,
    clearUserCode
  };
};

export const useTTS = () => {
  const { state, toggleTTS, setTTSEnabled, speakInstruction, stopSpeaking } = usePractice();
  return {
    isTtsEnabled: state.isTtsEnabled,
    isSpeaking: state.isSpeaking,
    toggleTTS,
    setTTSEnabled,
    speakInstruction,
    stopSpeaking
  };
};

export const useSessionProgress = () => {
  const { state, getProgressPercentage, getRemainingTime, canSubmitCode, getSessionSummary } = usePractice();
  return {
    progress: getProgressPercentage(),
    remainingTime: getRemainingTime(),
    canSubmit: canSubmitCode(),
    statistics: getSessionSummary(),
    completedChallenges: state.currentSession?.statistics.completedChallenges || 0,
    totalChallenges: state.currentSession?.statistics.totalChallenges || 0
  };
};

export default PracticeProvider;
