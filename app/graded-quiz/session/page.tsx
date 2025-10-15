'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GradedQuizSession } from './components/GradedQuizSession';
import { QuizComplete } from './components/QuizComplete';
import { QuizLoading } from './components/QuizLoading';

// --- Shared Interface Definitions ---
export interface QuizQuestion {
  Question: string;
  Answer: string;
  Category: string;
  Type: 'Practical' | 'Theoretical';
}

export interface QuizSessionData {
  questions: QuizQuestion[];
  startTime: number;
  registrationCode: string;
  quizNumber: 1 | 2 | 3 | 4;  
  userAnswers: { [questionIndex: number]: string };
  currentQuestionIndex: number;
  timeLimit: number;
  submitted?: boolean;
  endTime?: number; // Added optional endTime to the base type
  // ADDED: Flag to track if the questions have been shuffled to prevent re-shuffling on page refresh
  shuffled?: boolean; 
}

// Derived type for a completed session, which GUARANTEES endTime is present
export type CompletedQuizSession = Required<Pick<QuizSessionData, 'endTime'>> & QuizSessionData;

// -------------------------------------

/**
 * Standard Fisher-Yates shuffle algorithm.
 * @param array The array to shuffle.
 */
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array]; // Create a copy to avoid mutating the original
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default function GradedQuizSessionPage() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<QuizSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSession = () => {
      try {
        const storedSession = sessionStorage.getItem('gradedQuizSession');
        if (!storedSession) {
          // You may want to redirect the user to a start page if no session exists
          throw new Error('No active quiz session found. Please start the quiz again.');
        }

        let parsedSession: QuizSessionData = JSON.parse(storedSession);
        
        // Check if session is already submitted/completed
        if (parsedSession.submitted && parsedSession.endTime) {
          setSessionData(parsedSession as CompletedQuizSession);
          setIsLoading(false);
          return;
        }

        // 💡 SHUFFLING LOGIC
        // Only shuffle if the session is NOT marked as shuffled yet.
        if (!parsedSession.shuffled) {
          console.log('Shuffling quiz questions...');
          const shuffledQuestions = shuffleArray(parsedSession.questions);
          
          // Recreate the session data with the new order and reset state keys 
          // that rely on the old index (userAnswers).
          // NOTE: It's critical to reset userAnswers as the indices no longer match the questions.
          parsedSession = {
            ...parsedSession,
            questions: shuffledQuestions,
            userAnswers: {}, // Reset answers for the new question order
            currentQuestionIndex: 0, // Start at the first question
            shuffled: true, // Mark as shuffled
          };

          // IMPORTANT: Save the shuffled session immediately to sessionStorage
          // so a subsequent refresh doesn't re-shuffle.
          sessionStorage.setItem('gradedQuizSession', JSON.stringify(parsedSession));
        }

        setSessionData(parsedSession);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading quiz session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load quiz session');
        setIsLoading(false);
      }
    };

    loadSession();
  }, [router]);

  // ... (rest of the component remains the same)

  const handleSessionUpdate = (updatedSession: QuizSessionData) => {
    setSessionData(updatedSession);
    sessionStorage.setItem('gradedQuizSession', JSON.stringify(updatedSession));
  };

  const handleQuizComplete = (finalSession: QuizSessionData) => {
    const completedSession: CompletedQuizSession = { // Explicitly cast to the completed type
      ...finalSession,  
      endTime: Date.now(),
      submitted: true, // Ensure submitted is true for completion state
    };
    
    // Store the completed 
    sessionStorage.setItem('gradedQuizSession', JSON.stringify(completedSession));
    
    // State is now the completed type, which triggers the render of QuizComplete
    setSessionData(completedSession); 
  };

  if (isLoading) {
    return <QuizLoading />;
  }

  if (error) {
    // ... (error handling JSX)
  }

  if (sessionData?.endTime) {
    return <QuizComplete sessionData={sessionData as CompletedQuizSession} />;
  }

  if (!sessionData) {
    return null;
  }

  return (
    <GradedQuizSession
      sessionData={sessionData}
      onSessionUpdate={handleSessionUpdate}
      onQuizComplete={handleQuizComplete}
    />
  );
}

// Ensure you update the QuizSessionData interface with 'shuffled' in any shared files if necessary.
