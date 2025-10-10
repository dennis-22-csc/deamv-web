// app/graded-quiz/session/components/QuizNavigation.tsx
'use client';

import { ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface QuizNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  onNavigate: (index: number) => void;
  onSubmit: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

export const QuizNavigation: React.FC<QuizNavigationProps> = ({
  currentIndex,
  totalQuestions,
  onNavigate,
  onSubmit,
  hasNext,
  hasPrevious,
}) => {
  return (
    <div className="flex items-center justify-between bg-white rounded-lg border p-4">
      {/* Previous Button */}
      <Button
        variant="outline"
        onClick={() => onNavigate(currentIndex - 1)}
        disabled={!hasPrevious}
        className="flex items-center gap-2"
      >
        Previous
      </Button>

      {/* Question Progress */}
      <div className="text-center">
        <span className="text-sm text-gray-600">
          Question <strong>{currentIndex + 1}</strong> of <strong>{totalQuestions}</strong>
        </span>
      </div>

      {/* Next/Submit Buttons */}
      <div className="flex gap-2">
        {hasNext ? (
          <Button
            onClick={() => onNavigate(currentIndex + 1)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            Submit Quiz
          </Button>
        )}
      </div>
    </div>
  );
};
