// app/graded-quiz/session/page.tsx
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
}

// Derived type for a completed session, which GUARANTEES endTime is present
export type CompletedQuizSession = Required<Pick<QuizSessionData, 'endTime'>> & QuizSessionData;

// -------------------------------------

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
          throw new Error('No active quiz session found. Please start the quiz again.');
        }

        const parsedSession: QuizSessionData = JSON.parse(storedSession);
        
        // Check if session is already submitted and if it has endTime (for QuizComplete)
        if (parsedSession.submitted && parsedSession.endTime) {
          // If submitted, cast it to the guaranteed type before setting it
          setSessionData(parsedSession as CompletedQuizSession);
          setIsLoading(false);
          return;
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

  const handleSessionUpdate = (updatedSession: QuizSessionData) => {
    setSessionData(updatedSession);
    sessionStorage.setItem('gradedQuizSession', JSON.stringify(updatedSession));
  };

  const handleQuizComplete = (finalSession: QuizSessionData) => {
    // Mark as submitted and store
    const submittedSession: CompletedQuizSession = { // Explicitly cast to the completed type
      ...finalSession, 
      submitted: true, 
      endTime: Date.now(),
      // The rest of the properties are copied from finalSession
    };
    sessionStorage.setItem('gradedQuizSession', JSON.stringify(submittedSession));
    sessionStorage.setItem('gradedQuizSubmission', JSON.stringify(submittedSession));
    setSessionData(submittedSession); // State is now the completed type
  };

  if (isLoading) {
    return <QuizLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-6xl">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900">Session Error</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/graded-quiz')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
          >
            Restart Quiz
          </button>
        </div>
      </div>
    );
  }

  // FIX: Cast sessionData to the CompletedQuizSession type before passing to QuizComplete
  if (sessionData?.submitted) {
    // We check for 'submitted' and rely on the logic in handleQuizComplete ensuring 'endTime' is set
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
