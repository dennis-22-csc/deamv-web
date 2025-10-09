// app/graded-quiz/session/components/QuizProgress.tsx 
'use client';

import { CheckCircle, Circle, HelpCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface QuizProgressProps {
  totalQuestions: number;
  currentIndex: number;
  answeredQuestions: number[];
  onQuestionSelect: (index: number) => void;
  quizNumber: 1 | 2 | 3 | 4; 
}

export const QuizProgress: React.FC<QuizProgressProps> = ({
  totalQuestions,
  currentIndex,
  answeredQuestions,
  onQuestionSelect,
}) => {
  const getQuestionStatus = (index: number) => {
    if (answeredQuestions.includes(index)) return 'answered';
    if (index === currentIndex) return 'current';
    return 'unanswered';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'answered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'current':
        return <HelpCircle className="h-4 w-4 text-purple-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'answered':
        return 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100';
      case 'current':
        return 'bg-purple-50 border-purple-300 text-purple-700 ring-2 ring-purple-200 hover:bg-purple-100';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100';
    }
  };

  const handleQuestionClick = (index: number) => {
    onQuestionSelect(index);
    // Scroll will be handled by the parent component's useEffect
  };

  return (
    <Card className="p-4 sticky top-24"> {/* Sticky below header */}
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center">
          <h3 className="font-semibold text-gray-900">Quiz Progress</h3>
          <p className="text-sm text-gray-600">
            {answeredQuestions.length} of {totalQuestions} answered
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(answeredQuestions.length / totalQuestions) * 100}%` }}
          />
        </div>

        {/* Question Grid */}
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: totalQuestions }, (_, index) => {
            const status = getQuestionStatus(index);
            return (
              <button
                key={index}
                onClick={() => handleQuestionClick(index)}
                className={`
                  flex items-center justify-center p-2 rounded-lg border transition-all
                  hover:scale-105 hover:shadow-md ${getStatusClass(status)}
                `}
                title={`Question ${index + 1} - ${status}`}
              >
                <div className="text-center">
                  {getStatusIcon(status)}
                  <span className="text-xs font-medium block mt-1">{index + 1}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span className="text-gray-600">Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-3 w-3 text-purple-600" />
            <span className="text-gray-600">Current</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600">Not Started</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
