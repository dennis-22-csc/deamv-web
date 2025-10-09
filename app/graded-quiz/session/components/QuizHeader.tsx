// app/graded-quiz/session/components/QuizHeader.tsx 
'use client';

import { Clock, User, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface QuizHeaderProps {
  timeRemaining: number;
  registrationCode: string;
  totalQuestions: number;
  onSubmit: () => void;
}

export const QuizHeader: React.FC<QuizHeaderProps> = ({
  timeRemaining,
  registrationCode,
  totalQuestions,
  onSubmit,
}) => {
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isTimeLow = timeRemaining < 300000; // 5 minutes
  const isTimeCritical = timeRemaining < 60000; // 1 minute

  return (
    <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {registrationCode}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {totalQuestions} Questions
            </div>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isTimeCritical 
              ? 'bg-red-100 text-red-700 animate-pulse' 
              : isTimeLow 
                ? 'bg-orange-100 text-orange-700' 
                : 'bg-blue-100 text-blue-700'
          }`}>
            <Clock className="h-5 w-5" />
            <span className="text-xl font-mono font-bold">
              {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Submit Button */}
          <Button
            onClick={onSubmit}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4" />
            Submit Quiz
          </Button>
        </div>

        {/* Time Warning */}
        {isTimeLow && (
          <div className="mt-2 text-center">
            <div className={`${
              isTimeCritical 
                ? 'bg-red-100 border-red-300 text-red-700 animate-pulse' 
                : 'bg-orange-100 border-orange-300 text-orange-700'
            } border px-4 py-2 rounded-lg`}>
              <strong>Time Warning:</strong> Quiz will auto-submit when time expires
              {isTimeCritical && ' - Less than 1 minute remaining!'}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
