// app/graded-quiz/session/components/QuizSubmitDialog.tsx
'use client';

import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface QuizSubmitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  answeredCount: number;
  totalQuestions: number;
}

export const QuizSubmitDialog: React.FC<QuizSubmitDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  answeredCount,
  totalQuestions,
}) => {
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <div className="text-center space-y-4">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
          <AlertTriangle className="h-8 w-8 text-yellow-600" />
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900">
          Submit Quiz?
        </h3>
        
        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-700">Answered</span>
            </div>
            <span className="font-semibold text-green-600">{answeredCount}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-gray-700">Unanswered</span>
            </div>
            <span className="font-semibold text-red-600">{unansweredCount}</span>
          </div>
        </div>

        {/* Warning Message */}
        {unansweredCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">
              <strong>Note:</strong> You have {unansweredCount} unanswered question{unansweredCount !== 1 ? 's' : ''}. 
              Once submitted, you cannot make changes.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Continue Quiz
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Confirm Submit
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
