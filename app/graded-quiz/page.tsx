// app/graded-quiz/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
// Import the new dialog component
import { QuizUnavailableDialog } from '@/components/dialogs/QuizUnavailableDialog'; 

// Import the environment variable for graded quiz status
const GRADED_QUIZ_ENABLED = process.env.NEXT_PUBLIC_GRADED_QUIZ_ENABLED === 'true';

interface QuizQuestion {
  Question: string;
  Answer: string;
  Category: string;
  Type: 'Practical' | 'Theoretical';
}

export default function GradedQuizPage() {
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [quizNumber, setQuizNumber] = useState<1 | 2 | 3 | 4>(1);
  // State for the Quiz Unavailable dialog
  const [isQuizUnavailable, setIsQuizUnavailable] = useState(false); 

  // Check quiz status when component mounts
  useEffect(() => {
    if (!GRADED_QUIZ_ENABLED) {
        setIsQuizUnavailable(true);
    } else {
        loadQuizQuestions();
    }
  }, []);

  const loadQuizQuestions = async () => {
    setLoadingState('loading');
    setError('');
    setProgress(0);

    try {
      // ... (rest of loadQuizQuestions logic remains the same)
      setProgress(20);
      
      // Fetch the CSV file from the server
      const response = await fetch('/api/quiz-questions');
      
      setProgress(60);
      
      if (!response.ok) {
        throw new Error(`Failed to load quiz questions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setProgress(80);
      
      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions found in the quiz file');
      }
      
      setQuestions(data.questions);
      setQuizNumber(data.quizNumber || 1);
      setLoadingState('success');
      setProgress(100);
      
    } catch (err) {
      //console.error('Error loading quiz questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz questions');
      setLoadingState('error');
    }
  };

  // ... (handleStartQuiz, handleRetry, handleBack remain the same)
  const handleStartQuiz = () => {
    if (questions.length > 0) {
      // Store questions and quiz number in session storage for the quiz session
      const quizData = {
        questions,
        quizNumber
      };
      sessionStorage.setItem('gradedQuizQuestions', JSON.stringify(quizData));
      router.push('/graded-quiz/start');
    }
  };

  const handleRetry = () => {
    loadQuizQuestions();
  };

  const handleBack = () => {
    router.back();
  };

  // If the quiz is unavailable, render only the dialog
  if (!GRADED_QUIZ_ENABLED && isQuizUnavailable) {
      return (
          <QuizUnavailableDialog 
              isOpen={isQuizUnavailable} 
              onClose={() => router.push('/')} // Navigate home when closing
          />
      );
  }

  // If the quiz is enabled, but the state suggests it should be unavailable (shouldn't happen 
  // with the new useEffect logic, but as a fallback):
  // You might want to remove this or adjust if you want a different fallback
  if (!GRADED_QUIZ_ENABLED) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <p className="text-xl font-semibold text-gray-500">Quiz Unavailable...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      {/* ... (rest of the component structure) */}
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
        <Card className="p-8">
          <div className="text-center space-y-6">
            {/* Header Section */}
            <div className="space-y-3">
              <div className="mx-auto h-16 w-16 bg-purple-600 rounded-full flex items-center justify-center">
                <Download className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Loading Quiz Questions</h2>
            </div>

            {/* Progress Section */}
            {/* ... (rest of the component logic for loading/success/error states) */}
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Loading questions for Quiz {quizNumber}...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Status Display */}
            <div className="min-h-[200px] flex items-center justify-center">
              {loadingState === 'loading' && (
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 text-purple-600 animate-spin mx-auto" />
                  <p className="text-gray-600">Downloading quiz questions for Quiz {quizNumber} from server...</p>
                </div>
              )}

              {loadingState === 'success' && (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-green-700">Questions Loaded Successfully!</h3>
                    <p className="text-gray-600">
                      Ready to start Quiz {quizNumber} with {questions.length} questions.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="font-semibold text-green-800">Total Questions</div>
                        <div className="text-2xl font-bold text-green-600">{questions.length}</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="font-semibold text-blue-800">Categories</div>
                        <div className="text-lg font-bold text-blue-600">
                          {[...new Set(questions.map(q => q.Category))].length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {loadingState === 'error' && (
                <div className="text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-red-700">Failed to Load Questions</h3>
                    <p className="text-gray-600">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center pt-4">
              {loadingState === 'error' && (
                <>
                  <Button
                    onClick={handleRetry}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Retry Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBack}
                  >
                    Go Back
                  </Button>
                </>
              )}

              {loadingState === 'success' && (
                <Button
                  onClick={handleStartQuiz}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-8"
                  size="lg"
                >
                  <Clock className="h-5 w-5" />
                  Start Quiz {quizNumber}
                </Button>
              )}
            </div>

            {/* Quiz Information */}
            {loadingState === 'success' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-blue-800 mb-2">Quiz Information</h4>
                <ul className="text-sm text-blue-700 space-y-1 text-left">
                  <li>• You will need to enter a registration code before starting</li>
                  <li>• Your registration code needs to be one given to you by one of our partner institutions</li>
                  <li>• You can skip questions and return to them later</li>
                  <li>• The quiz will auto-submit when time expires</li>
                  <li>• Your progress will be saved automatically</li>
                </ul>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
