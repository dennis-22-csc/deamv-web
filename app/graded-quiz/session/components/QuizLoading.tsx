// app/graded-quiz/session/components/QuizLoading.tsx
'use client';

import { Loader2, Clock } from 'lucide-react';

export const QuizLoading: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="relative">
          <Loader2 className="h-16 w-16 text-purple-600 animate-spin mx-auto" />
          <Clock className="h-8 w-8 text-purple-400 absolute top-4 left-1/2 -translate-x-1/2" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Loading Quiz Session</h1>
          <p className="text-gray-600">Preparing your questions and timer...</p>
        </div>
        <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
          <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );
};
