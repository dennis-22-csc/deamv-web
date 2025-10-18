// app/graded-quiz/session/components/GradedQuizSession.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QuizHeader } from './QuizHeader';
import { QuizQuestion } from './QuizQuestion';
import { QuizNavigation } from './QuizNavigation';
import { QuizProgress } from './QuizProgress';
import { QuizSubmitDialog } from './QuizSubmitDialog';

interface QuizQuestion {
  Question: string;
  Answer: string;
  Category: string;
  Type: 'Practical' | 'Theoretical';
}

interface QuizSessionData {
  questions: QuizQuestion[];
  startTime: number;
  registrationCode: string;
  quizNumber: 1 | 2 | 3 | 4;
  userAnswers: { [questionIndex: number]: string };
  currentQuestionIndex: number;
  timeLimit: number;
}

interface GradedQuizSessionProps {
  sessionData: QuizSessionData;
  onSessionUpdate: (session: QuizSessionData) => void;
  onQuizComplete: (session: QuizSessionData) => void;
}

export const GradedQuizSession: React.FC<GradedQuizSessionProps> = ({
  sessionData,
  onSessionUpdate,
  onQuizComplete,
}) => {
  const router = useRouter();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(sessionData.timeLimit);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Auto-submit handler - properly memoized
  const handleAutoSubmit = useCallback(() => {
    console.log('🕒 Time elapsed - auto-submitting quiz...');
    const finalSession = {
      ...sessionData,
      endTime: Date.now()
    };
    onQuizComplete(finalSession);
  }, [sessionData, onQuizComplete]);

  // Timer effect with auto-submit
  useEffect(() => {
    const elapsed = Date.now() - sessionData.startTime;
    const remaining = Math.max(0, sessionData.timeLimit - elapsed);
    setTimeRemaining(remaining);

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionData.startTime, sessionData.timeLimit, handleAutoSubmit]);

  // Scroll to show both header and current question when question changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [sessionData.currentQuestionIndex]);

  const updateAnswer = (questionIndex: number, answer: string) => {
    const updatedAnswers = {
      ...sessionData.userAnswers,
      [questionIndex]: answer
    };
    
    const updatedSession = {
      ...sessionData,
      userAnswers: updatedAnswers,
    };
    
    onSessionUpdate(updatedSession);
  };

  const navigateToQuestion = (questionIndex: number) => {
    const updatedSession = {
      ...sessionData,
      currentQuestionIndex: questionIndex
    };
    
    onSessionUpdate(updatedSession);
  };

  const handleSubmitQuiz = () => {
    setShowSubmitDialog(true);
  };

  const confirmSubmit = () => {
    const finalSession = {
      ...sessionData,
      endTime: Date.now()
    };
    onQuizComplete(finalSession);
    setShowSubmitDialog(false);
  };

  const currentQuestion = sessionData.questions[sessionData.currentQuestionIndex];
  const totalQuestions = sessionData.questions.length;
  const answeredCount = Object.keys(sessionData.userAnswers).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with Timer - Always visible at top */}
      <QuizHeader
        timeRemaining={timeRemaining}
        registrationCode={sessionData.registrationCode}
        quizNumber={sessionData.quizNumber}
        totalQuestions={totalQuestions}
        onSubmit={handleSubmitQuiz}
      />

      <div ref={mainContentRef} className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <QuizProgress
              totalQuestions={totalQuestions}
              currentIndex={sessionData.currentQuestionIndex}
              answeredQuestions={Object.keys(sessionData.userAnswers).map(Number)}
              onQuestionSelect={navigateToQuestion}
              quizNumber={sessionData.quizNumber}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Question */}
            <QuizQuestion
              question={currentQuestion}
              questionNumber={sessionData.currentQuestionIndex + 1}
              totalQuestions={totalQuestions}
              answer={sessionData.userAnswers[sessionData.currentQuestionIndex] || ''}
              onAnswerChange={(answer) => updateAnswer(sessionData.currentQuestionIndex, answer)}
            />

            {/* Navigation */}
            <QuizNavigation
              currentIndex={sessionData.currentQuestionIndex}
              totalQuestions={totalQuestions}
              onNavigate={navigateToQuestion}
              onSubmit={handleSubmitQuiz}
              hasNext={sessionData.currentQuestionIndex < totalQuestions - 1}
              hasPrevious={sessionData.currentQuestionIndex > 0}
            />
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <QuizSubmitDialog
        isOpen={showSubmitDialog}
        onClose={() => setShowSubmitDialog(false)}
        onConfirm={confirmSubmit}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        quizNumber={sessionData.quizNumber}
      />
    </div>
  );
};
