// app/graded-quiz/session/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GradedQuizSession } from './components/GradedQuizSession';
import { QuizComplete } from './components/QuizComplete';
import { QuizLoading } from './components/QuizLoading';
import { QuizUnavailableDialog } from '@/components/dialogs/QuizUnavailableDialog';
import { Card } from '@/components/ui/Card'; 
import { Button } from '@/components/ui/Button'; 
import { AlertCircle } from 'lucide-react'; 

// 2. Add the Graded Quiz Enabled check
const GRADED_QUIZ_ENABLED = process.env.NEXT_PUBLIC_GRADED_QUIZ_ENABLED === 'true';

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
  endTime?: number;	
  shuffled?: boolean;	
}

export type CompletedQuizSession = Required<Pick<QuizSessionData, 'endTime'>> & QuizSessionData;

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
  // 3. State for Quiz Unavailable Dialog
  const [isQuizUnavailable, setIsQuizUnavailable] = useState(false);

  useEffect(() => {
    // 4. Check global quiz status first on mount
    if (!GRADED_QUIZ_ENABLED) {
        setIsQuizUnavailable(true);
        setIsLoading(false); // Stop loading to render dialog
        return; // Halt further execution
    }

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
          //console.log('Shuffling quiz questions...');
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
        //console.error('Error loading quiz session:', err);
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

  // 5. Early return for Quiz Disabled
  if (isQuizUnavailable) {
      return (
          <QuizUnavailableDialog 
              isOpen={true} 
              onClose={() => router.push('/')} // Navigate home when closing
          />
      );
  }

  // --- Loading State ---
  if (isLoading) {
    return <QuizLoading />;
  }

  // --- Error State (for session load errors, not disability) ---
  if (error) {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <Card className="p-10 text-center w-full max-w-md shadow-lg">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Session Load Error</h2>
                <p className="text-gray-600 mb-8">{error}</p>
                <Button onClick={() => router.push('/graded-quiz')} className="w-full">
                    Return to Quiz Start
                </Button>
            </Card>
        </div>
    );
  }

  // --- Quiz Complete State ---
  if (sessionData?.endTime) {
    return <QuizComplete sessionData={sessionData as CompletedQuizSession} />;
  }

  if (!sessionData) {
    return null;
  }

  // --- Active Session State ---
  return (
    <GradedQuizSession
      sessionData={sessionData}
      onSessionUpdate={handleSessionUpdate}
      onQuizComplete={handleQuizComplete}
    />
  );
}
