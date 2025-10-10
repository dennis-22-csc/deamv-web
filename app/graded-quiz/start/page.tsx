// app/graded-quiz/start/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, CheckCircle, AlertCircle, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { QuizConfirmationDialog } from '@/components/dialogs/QuizConfirmationDialog';

// ... (Interface and constant definitions remain the same)
interface QuizQuestion {
  Question: string;
  Answer: string;
  Category: string;
  Type: 'Practical' | 'Theoretical';
}

interface QuizData {
  questions: QuizQuestion[];
  quizNumber: 1 | 2 | 3 | 4;
}

const TIME_LIMIT_MINUTES = parseInt(
  process.env.NEXT_PUBLIC_QUIZ_TIME_LIMIT ?? '60',
  10
);
// Calculate time limit in milliseconds
const TIME_LIMIT_MS = TIME_LIMIT_MINUTES * 60 * 1000;


export default function GradedQuizStartPage() {
  const router = useRouter();
  const [registrationCode, setRegistrationCode] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);

  // Load questions from session storage (useEffect remains the same)
  useEffect(() => {
    const loadQuestions = () => {
      try {
        const storedQuizData = sessionStorage.getItem('gradedQuizQuestions');
        if (!storedQuizData) {
          throw new Error('No quiz data found. Please load the quiz again.');
        }

        const parsedData: QuizData = JSON.parse(storedQuizData);
        if (!parsedData.questions || parsedData.questions.length === 0) {
          throw new Error('No questions available. Please load the quiz again.');
        }

        setQuizData(parsedData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading quiz data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load quiz data');
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, []);


  // Check for prior submission based on registration code and quiz number (useEffect remains the same)
  useEffect(() => {
    const code = registrationCode.trim();

    if (!quizData || !code) {
      setIsAlreadySubmitted(false);
      return;
    }

    try {
      const storedSession = sessionStorage.getItem('gradedQuizSession');
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession);
        // Check for a match on registrationCode, quizNumber, and submitted: true
        if (
          parsedSession.registrationCode === code &&
          parsedSession.quizNumber === quizData.quizNumber &&
          parsedSession.submitted === true
        ) {
          setIsAlreadySubmitted(true);
          // Set a specific error for the UI
          setError(`Quiz ${quizData.quizNumber} has already been submitted for code: ${code}`);
          return;
        }
      }
      setIsAlreadySubmitted(false);
      if (error.startsWith('Quiz')) {
        setError(''); // Clear the 'already submitted' error if the code changes
      }
    } catch (e) {
      console.error("Error checking session storage for submission status:", e);
      setIsAlreadySubmitted(false);
    }
  }, [registrationCode, quizData, error]);


  const handleBack = () => {
    router.back();
  };

  const handleStartQuiz = () => {
    // Primary check: Do not proceed if already submitted
    if (isAlreadySubmitted) {
      return;
    }

    const code = registrationCode.trim();

    if (!code) {
      setError('Please enter your registration code');
      return;
    }

    if (code.length < 3) {
      setError('Registration code appears to be invalid');
      return;
    }

    setError('');
    setShowConfirmation(true);
  };

  const handleConfirmStart = () => {
    if (!quizData || isAlreadySubmitted) return;

    const code = registrationCode.trim();

    // Store registration code in session storage
    sessionStorage.setItem('gradedQuizRegistrationCode', code);

    // Initialize quiz session
    const quizSession = {
      questions: quizData.questions,
      registrationCode: code,
      quizNumber: quizData.quizNumber,
      startTime: Date.now(),
      userAnswers: {} as { [questionIndex: number]: string },
      currentQuestionIndex: 0,
      timeLimit: TIME_LIMIT_MS,
      submitted: false,
    };

    sessionStorage.setItem('gradedQuizSession', JSON.stringify(quizSession));

    // Navigate to the actual quiz
    router.push('/graded-quiz/session');
  };

  const handleCancelStart = () => {
    setShowConfirmation(false);
  };

  const handleRetryLoad = () => {
    router.push('/graded-quiz');
  };

  // --- Loading State (No changes needed, it's already centered and clean) ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quiz data...</p>
        </div>
      </div>
    );
  }

  // --- Error State (Slight cleanup for consistency) ---
  if (error && !quizData) { // General error if quizData failed to load
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-white shadow-md border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                Back
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Graded Quiz</h1>
            </div>
          </div>
        </header>

        <main className="flex-grow max-w-4xl mx-auto px-4 py-12 w-full flex items-start justify-center">
          <Card className="p-10 text-center w-full max-w-md shadow-lg">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Unable to Start Quiz</h2>
            <p className="text-gray-600 mb-8">{error}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleRetryLoad} className="w-full sm:w-auto">
                Reload Quiz Questions
              </Button>
              <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
                Go Back
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  if (!quizData) {
    return null;
  }

  // --- Main Start Page (Significant improvements here) ---
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md border-b z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Graded Quiz {quizData.quizNumber}</h1>
          </div>
        </div>
      </header>

      {/* Main Content Area: Centered and Responsive Card */}
      <main className="flex-grow max-w-4xl mx-auto px-4 py-8 md:py-12 w-full flex justify-center">
        <Card className="p-6 sm:p-8 md:p-10 w-full max-w-xl shadow-2xl transition-all duration-300">
          <div className="space-y-6 md:space-y-8">
            {/* Header Section */}
            <div className="text-center space-y-3">
              <div className="mx-auto h-16 w-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                Begin Quiz {quizData.quizNumber}
              </h2>
              <p className="text-gray-600 text-base md:text-lg max-w-md mx-auto">
                Enter your unique registration code to start the quiz session.
              </p>
            </div>

            {/* Quiz Summary - Refined Design */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 shadow-inner">
              <h3 className="font-bold text-gray-800 mb-4 text-center">Quiz Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-gray-700">Total Questions</span>
                  </div>
                  <div className="text-xl font-bold text-purple-600">
                    {quizData.questions.length}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-700">Time Limit</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {TIME_LIMIT_MINUTES} min
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Code Input & Error */}
            <div className="space-y-4 pt-2">
              <div className="text-left">
                <label htmlFor="registrationCode" className="block text-sm font-semibold text-gray-700 mb-2">
                  Registration Code <span className="text-red-500">*</span>
                </label>
                <Input
                  id="registrationCode"
                  type="text"
                  value={registrationCode}
                  onChange={(e) => {
                    setRegistrationCode(e.target.value);
                    if (!isAlreadySubmitted) {
                      setError('');
                    }
                  }}
                  placeholder="Enter your unique code (e.g., 89052035-191311)"
                  className="text-lg text-center font-mono py-2 focus:border-purple-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleStartQuiz();
                    }
                  }}
                />
                {error && ( // Display error message
                  <p className="text-red-600 text-sm mt-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <b>Error:</b> {error}
                  </p>
                )}
              </div>
            </div>

            {/* Important Alert Section - Clearer Visual Hierarchy */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg p-4 text-left shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Important Note:</strong> This is <b>Quiz {quizData.quizNumber}</b>. Your submission will be permanently recorded under this quiz number.
                </div>
              </div>
            </div>

            {/* Action Buttons - Full-width on mobile, centered on desktop */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                onClick={handleStartQuiz}
                disabled={!registrationCode.trim() || isAlreadySubmitted}
                className={`flex items-center justify-center gap-2 px-8 py-3 w-full sm:w-auto text-lg font-bold transition duration-200 ${isAlreadySubmitted ? 'bg-gray-400 hover:bg-gray-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                size="lg"
              >
                {isAlreadySubmitted ? 'Already Submitted' : `Start Quiz ${quizData.quizNumber}`}
              </Button>
              <Button
                variant="outline"
                onClick={handleBack}
                className="w-full sm:w-auto border-gray-300 hover:bg-gray-100 py-3"
              >
                Cancel
              </Button>
            </div>

            {/* Quiz Instructions - Clearer, more concise list */}
            <div className="bg-blue-50 border-t-4 border-blue-500 rounded-b-lg p-5 text-left shadow-sm">
              <h4 className="font-bold text-blue-800 mb-3 text-lg">Key Instructions</h4>
              <ul className="text-sm text-blue-700 space-y-2 list-none pl-0">
                <li className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>Your code is your unique identifier for grading.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>You can skip and return to any question within the time limit.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>The quiz auto-submits when the {TIME_LIMIT_MINUTES}-minute time limit expires.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span className="font-semibold">All submissions are final and you can't resubmit.</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </main>

      {/* Quiz-Specific Confirmation Dialog (remains the same) */}
      <QuizConfirmationDialog
        isOpen={showConfirmation}
        onClose={handleCancelStart}
        onConfirm={handleConfirmStart}
        registrationCode={registrationCode}
        quizNumber={quizData.quizNumber}
      />
    </div>
  );
}
