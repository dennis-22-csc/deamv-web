// app/graded-quiz/start/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { QuizConfirmationDialog } from '@/components/dialogs/QuizConfirmationDialog';

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
  process.env.NEXT_PUBLIC_QUIZ_TIME_LIMIT,
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

  // Load questions from session storage
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


  // Check for prior submission based on registration code and quiz number
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
  }, [registrationCode, quizData, error]); // Re-run when code or quiz data changes


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

  if (error && !quizData) { // General error if quizData failed to load
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Graded Quiz</h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to Start Quiz</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={handleRetryLoad}>
                Reload Quiz Questions
              </Button>
              <Button variant="outline" onClick={handleBack}>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Graded Quiz {quizData.quizNumber}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-8">
          <div className="text-center space-y-8">
            {/* Header Section */}
            <div className="space-y-4">
              <div className="mx-auto h-20 w-20 bg-purple-600 rounded-full flex items-center justify-center">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Enter Registration Code</h2>
              <p className="text-gray-600 text-lg">
                Please enter your unique registration code to begin Quiz {quizData.quizNumber}
              </p>
            </div>

            {/* Quiz Summary */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Quiz {quizData.quizNumber} Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="font-semibold text-gray-700">Total Questions</div>
                  <div className="text-2xl font-bold text-purple-600">{quizData.questions.length}</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="font-semibold text-gray-700">Categories</div>
                  <div className="text-lg font-bold text-blue-600">
                    {[...new Set(quizData.questions.map(q => q.Category))].length}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                Time limit: {TIME_LIMIT_MINUTES} minutes • Auto-submit when time expires • Submitting to Quiz {quizData.quizNumber} tab
              </div>
            </div>

            {/* Registration Code Input */}
            <div className="space-y-4">
              <div className="text-left">
                <label htmlFor="registrationCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Code *
                </label>
                <Input
                  id="registrationCode"
                  type="text"
                  value={registrationCode}
                  onChange={(e) => {
                    setRegistrationCode(e.target.value);
                    // Only clear generic errors here, 'already submitted' error handled in useEffect
                    if (!isAlreadySubmitted) {
                      setError('');
                    }
                  }}
                  placeholder="Enter your registration code (e.g., 89052035-191311)"
                  className="text-lg text-center font-mono"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleStartQuiz();
                    }
                  }}
                />
                {error && ( // Display error message
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <strong>Important:</strong> This is Quiz {quizData.quizNumber}. Your submission will be recorded in the Quiz {quizData.quizNumber} tab. Please verify your registration code carefully.
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center pt-4">
              <Button
                onClick={handleStartQuiz}
                disabled={!registrationCode.trim() || isAlreadySubmitted} // 🛑 DISABLED if code is empty OR already submitted
                className={`flex items-center gap-2 px-8 ${isAlreadySubmitted ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                size="lg"
              >
                {isAlreadySubmitted ? 'Already Submitted' : `Start Quiz ${quizData.quizNumber}`}
              </Button>
              <Button
                variant="outline"
                onClick={handleBack}
              >
                Cancel
              </Button>
            </div>

            {/* Quiz Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
              <h4 className="font-semibold text-blue-800 mb-3">Quiz Instructions</h4>
              <div className="text-sm text-blue-700 space-y-2">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Your registration code uniquely identifies you for grading purposes</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>You can skip questions and return to them later if time permits</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>The quiz will automatically submit when the time limit is reached</span>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>All submissions are final and cannot be modified after submission</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">Quiz {quizData.quizNumber}:</span>
                  <span>Your results will be saved to the Quiz {quizData.quizNumber} tab</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </main>

      {/* Quiz-Specific Confirmation Dialog */}
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
