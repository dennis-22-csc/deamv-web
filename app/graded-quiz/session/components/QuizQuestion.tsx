// app/graded-quiz/session/components/QuizQuestion.tsx 
'use client';

import { useState } from 'react';
import { Cpu, Brain } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';

interface QuizQuestionProps {
  question: {
    Question: string;
    Answer: string;
    Category: string;
    Type: 'Practical' | 'Theoretical';
  };
  questionNumber: number;
  totalQuestions: number;
  answer: string;
  onAnswerChange: (answer: string) => void;
}

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  questionNumber,
  totalQuestions,
  answer,
  onAnswerChange,
}) => {
  const [wordCount, setWordCount] = useState(0);

  const handleAnswerChange = (value: string) => {
    onAnswerChange(value);
    setWordCount(value.trim() ? value.trim().split(/\s+/).length : 0);
  };

  const getTypeIcon = (type: 'Practical' | 'Theoretical') => {
    return type === 'Practical' ? <Cpu className="h-4 w-4" /> : <Brain className="h-4 w-4" />;
  };

  const getTypeColor = (type: 'Practical' | 'Theoretical') => {
    return type === 'Practical' 
      ? 'bg-green-100 text-green-700 border-green-200' 
      : 'bg-purple-100 text-purple-700 border-purple-200';
  };

  return (
    <Card className="p-6 space-y-6" id={`question-${questionNumber}`}>
      {/* Question Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              Question {questionNumber} of {totalQuestions}
            </span>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
              {question.Category}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(question.Type)}`}>
              <div className="flex items-center gap-1">
                {getTypeIcon(question.Type)}
                {question.Type}
              </div>
            </span>
          </div>
        </div>
      </div>

      {/* Question Text */}
      <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
        <h3 className="text-lg font-semibold text-gray-900 leading-relaxed">
          {question.Question}
        </h3>
      </div>

      {/* Answer Area */}
      <div className="space-y-4">
        <label htmlFor={`answer-${questionNumber}`} className="block text-sm font-medium text-gray-700">
          Your Answer
        </label>
        
        <Textarea
          id={`answer-${questionNumber}`}
          value={answer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          placeholder={
            question.Type === 'Practical'
              ? "Write your code here..."
              : "Write your explanation or answer here..."
          }
          rows={question.Type === 'Practical' ? 12 : 8}
          className={`font-mono text-sm resize-none ${
            question.Type === 'Practical' ? 'font-mono' : 'font-sans'
          }`}
        />

        {/* Word Count for theoretical questions */}
        {question.Type === 'Theoretical' && (
          <div className="text-right">
            <span className="text-sm text-gray-500">
              Word count: {wordCount}
            </span>
          </div>
        )}

        {/* Helper Text based on question type */}
        {question.Type === 'Practical' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <Cpu className="h-4 w-4" />
              <span className="text-sm font-medium">Practical Question Tips</span>
            </div>
            <ul className="text-green-600 text-sm space-y-1">
              <li>• Write executable code with proper syntax</li>
              <li>• Include necessary imports and libraries</li>
              <li>• Use proper indentation and code structure</li>
            </ul>
          </div>
        )}

        {question.Type === 'Theoretical' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-purple-700 mb-2">
              <Brain className="h-4 w-4" />
              <span className="text-sm font-medium">Theoretical Question Tips</span>
            </div>
            <ul className="text-purple-600 text-sm space-y-1">
              <li>• Provide clear and concise explanations</li>
              <li>• Use proper terminology and definitions</li>
              <li>• Structure your answer logically</li>
              <li>• Include relevant examples where appropriate</li>
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};
