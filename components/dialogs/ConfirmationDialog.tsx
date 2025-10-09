import React from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  HelpCircle, 
  Trash2, 
  LogOut,
  Settings,
  RefreshCw,
  Archive
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
  loading?: boolean;
  destructive?: boolean;
  showCancel?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this action?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = 'default',
  icon,
  loading = false,
  destructive = false,
  showCancel = true,
  closeOnOverlayClick = true,
  className = '',
}) => {
  const getVariantConfig = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: icon || <AlertCircle className="h-6 w-6 text-red-600" />,
          confirmVariant: 'secondary' as const,
          confirmColor: 'red' as const,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      case 'warning':
        return {
          icon: icon || <AlertTriangle className="h-6 w-6 text-yellow-600" />,
          confirmVariant: 'primary' as const,
          confirmColor: 'yellow' as const,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
      case 'info':
        return {
          icon: icon || <HelpCircle className="h-6 w-6 text-blue-600" />,
          confirmVariant: 'primary' as const,
          confirmColor: 'blue' as const,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        };
      default:
        return {
          icon: icon || <HelpCircle className="h-6 w-6 text-gray-600" />,
          confirmVariant: 'primary' as const,
          confirmColor: 'blue' as const,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const config = getVariantConfig();

  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant={variant}
      confirmText={confirmText}
      cancelText={cancelText}
      onConfirm={handleConfirm}
      onCancel={onClose}
      loading={loading}
      showCancel={showCancel}
      closeOnOverlayClick={closeOnOverlayClick}
      className={className}
    >
      <div className="space-y-4">
        {/* Icon and Message */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {config.icon}
          </div>
          <div className="flex-1">
            <p className="text-gray-700 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Additional Warning for Destructive Actions */}
        {destructive && (
          <div className={`${config.bgColor} border ${config.borderColor} rounded-lg p-3`}>
            <p className="text-sm font-medium">
              This action cannot be undone.
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
};

// Pre-configured confirmation dialogs for common scenarios

interface LeavePracticeDialogProps extends Omit<ConfirmationDialogProps, 
  'title' | 'message' | 'confirmText' | 'variant' | 'icon'
> {
  progress?: number;
  totalChallenges?: number;
}

const LeavePracticeDialog: React.FC<LeavePracticeDialogProps> = ({
  progress = 0,
  totalChallenges = 0,
  ...props
}) => {
  const completionRate = totalChallenges > 0 ? Math.round((progress / totalChallenges) * 100) : 0;

  return (
    <ConfirmationDialog
      title="Leave Practice Session?"
      message={`You've completed ${progress} of ${totalChallenges} challenges (${completionRate}%). Your progress will be saved automatically.`}
      confirmText="Leave Session"
      cancelText="Continue Practicing"
      variant="warning"
      icon={<LogOut className="h-6 w-6 text-yellow-600" />}
      {...props}
    />
  );
};

interface ClearDataDialogProps extends Omit<ConfirmationDialogProps, 
  'title' | 'message' | 'confirmText' | 'variant' | 'icon' | 'destructive'
> {
  dataType?: 'questions' | 'progress' | 'all';
}

const ClearDataDialog: React.FC<ClearDataDialogProps> = ({
  dataType = 'questions',
  ...props
}) => {
  const getConfig = () => {
    switch (dataType) {
      case 'questions':
        return {
          title: "Clear All Questions?",
          message: "This will remove all loaded practice questions and categories. You'll need to reload a questions file to practice again.",
          confirmText: "Clear Questions",
        };
      case 'progress':
        return {
          title: "Reset Progress?",
          message: "This will reset all your practice progress and completion records. Your loaded questions will remain available.",
          confirmText: "Reset Progress",
        };
      case 'all':
        return {
          title: "Clear All Data?",
          message: "This will remove all questions, categories, and progress data. The app will be reset to its initial state.",
          confirmText: "Clear Everything",
        };
      default:
        return {
          title: "Clear Data?",
          message: "This action will remove data from the application.",
          confirmText: "Clear Data",
        };
    }
  };

  const config = getConfig();

  return (
    <ConfirmationDialog
      {...config}
      variant="danger"
      icon={<Trash2 className="h-6 w-6 text-red-600" />}
      destructive={true}
      {...props}
    />
  );
};

interface ResetSettingsDialogProps extends Omit<ConfirmationDialogProps, 
  'title' | 'message' | 'confirmText' | 'variant' | 'icon'
> {}

const ResetSettingsDialog: React.FC<ResetSettingsDialogProps> = (props) => {
  return (
    <ConfirmationDialog
      title="Reset Settings?"
      message="This will restore all settings to their default values. Your practice data and progress will not be affected."
      confirmText="Reset Settings"
      variant="warning"
      icon={<Settings className="h-6 w-6 text-yellow-600" />}
      {...props}
    />
  );
};

interface RefreshQuestionsDialogProps extends Omit<ConfirmationDialogProps, 
  'title' | 'message' | 'confirmText' | 'variant' | 'icon'
> {
  newQuestionCount?: number;
}

const RefreshQuestionsDialog: React.FC<RefreshQuestionsDialogProps> = ({
  newQuestionCount,
  ...props
}) => {
  const message = newQuestionCount 
    ? `Loading this file will add ${newQuestionCount} new questions. Existing questions will be preserved.`
    : "Loading a new questions file will add to your existing collection. You can always switch between categories.";

  return (
    <ConfirmationDialog
      title="Load New Questions?"
      message={message}
      confirmText="Load Questions"
      variant="info"
      icon={<RefreshCw className="h-6 w-6 text-blue-600" />}
      {...props}
    />
  );
};

interface SaveProgressDialogProps extends Omit<ConfirmationDialogProps, 
  'title' | 'message' | 'confirmText' | 'variant' | 'icon'
> {
  unsavedChanges?: number;
}

const SaveProgressDialog: React.FC<SaveProgressDialogProps> = ({
  unsavedChanges = 0,
  ...props
}) => {
  return (
    <ConfirmationDialog
      title="Save Progress?"
      message={`You have ${unsavedChanges} unsaved challenge${unsavedChanges === 1 ? '' : 's'}. Your progress will be lost if you don't save.`}
      confirmText="Save & Exit"
      cancelText="Exit Without Saving"
      variant="warning"
      icon={<Archive className="h-6 w-6 text-yellow-600" />}
      {...props}
    />
  );
};

// Quick confirmation for simple actions
interface QuickConfirmDialogProps extends Omit<ConfirmationDialogProps, 
  'showCancel' | 'closeOnOverlayClick'
> {
  action: string;
}

const QuickConfirmDialog: React.FC<QuickConfirmDialogProps> = ({
  action,
  message,
  ...props
}) => {
  return (
    <ConfirmationDialog
      title={`${action}?`}
      message={message || `Are you sure you want to ${action.toLowerCase()}?`}
      confirmText={action}
      showCancel={true}
      closeOnOverlayClick={true}
      {...props}
    />
  );
};

// Confirmation with custom content
interface CustomConfirmDialogProps extends Omit<ConfirmationDialogProps, 'message'> {
  children: React.ReactNode;
}

const CustomConfirmDialog: React.FC<CustomConfirmDialogProps> = ({
  children,
  ...props
}) => {
  return (
    <Dialog
      {...props}
      variant={props.variant || 'default'}
      confirmText={props.confirmText || 'Confirm'}
      cancelText={props.cancelText || 'Cancel'}
      onConfirm={props.onConfirm}
      onCancel={props.onClose}
      loading={props.loading}
      showCancel={props.showCancel !== false}
      closeOnOverlayClick={props.closeOnOverlayClick !== false}
    >
      <div className="space-y-4">
        {children}
      </div>
    </Dialog>
  );
};

// Batch action confirmation
interface BatchActionDialogProps extends Omit<ConfirmationDialogProps, 
  'title' | 'message' | 'variant'
> {
  action: string;
  itemCount: number;
  itemType: string;
}

const BatchActionDialog: React.FC<BatchActionDialogProps> = ({
  action,
  itemCount,
  itemType,
  ...props
}) => {
  return (
    <ConfirmationDialog
      title={`${action} ${itemCount} ${itemType}${itemCount === 1 ? '' : 's'}?`}
      message={`This will ${action.toLowerCase()} ${itemCount} ${itemType}${itemCount === 1 ? '' : 's'}. This action cannot be undone.`}
      confirmText={action}
      variant="danger"
      destructive={true}
      icon={<AlertCircle className="h-6 w-6 text-red-600" />}
      {...props}
    />
  );
};

export {
  ConfirmationDialog,
  LeavePracticeDialog,
  ClearDataDialog,
  ResetSettingsDialog,
  RefreshQuestionsDialog,
  SaveProgressDialog,
  QuickConfirmDialog,
  CustomConfirmDialog,
  BatchActionDialog,
};
