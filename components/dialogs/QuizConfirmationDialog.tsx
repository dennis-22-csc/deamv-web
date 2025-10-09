// components/dialogs/QuizConfirmationDialog.tsx
'use client';

import { Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface QuizConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  registrationCode: string;
  isLoading?: boolean;
}

export const QuizConfirmationDialog: React.FC<QuizConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  registrationCode,
  isLoading = false,
}) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <div className="text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-purple-100">
          <Shield className="h-8 w-8 text-purple-600" />
        </div>
        
        {/* Title */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">
            Confirm Registration Code
          </h3>
          <div className="text-sm text-gray-600 space-y-3">
            <div>Please confirm that this is your correct registration code:</div>
            <div className="bg-gray-100 p-4 rounded-lg border">
              <code className="text-lg font-mono font-bold text-purple-600 break-all">
                {registrationCode}
              </code>
            </div>
            <div className="text-xs text-gray-500">
              <strong>Note:</strong> This cannot be changed once the quiz starts.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            No, Let Me Check
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? 'Starting...' : 'Yes, Start Quiz'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
