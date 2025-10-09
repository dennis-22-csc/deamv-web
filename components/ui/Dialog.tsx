import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'alert' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  loading?: boolean;
  className?: string;
}

const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    children,
    variant = 'default',
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    showCancel = true,
    loading = false,
    className = '',
  }, ref) => {
    // Handle escape key
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when dialog is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeStyles = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      fullscreen: 'max-w-full max-h-full m-4',
    };

    const variantIcons = {
      default: null,
      alert: AlertCircle,
      success: CheckCircle,
      warning: AlertTriangle,
      error: AlertCircle,
    };

    const variantColors = {
      default: 'text-blue-600',
      alert: 'text-blue-600',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
    };

    const IconComponent = variantIcons[variant];

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && closeOnOverlayClick) {
        onClose();
      }
    };

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleOverlayClick}
        />

        {/* Dialog Container */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            ref={ref}
            className={`
              relative bg-white rounded-xl shadow-xl w-full
              transform transition-all
              ${sizeStyles[size]}
              ${className}
            `}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  {IconComponent && (
                    <IconComponent className={`h-6 w-6 ${variantColors[variant]}`} />
                  )}
                  {title && (
                    <h2 className="text-xl font-semibold text-gray-900">
                      {title}
                    </h2>
                  )}
                </div>

                {showCloseButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              {message && !children && (
                <p className="text-gray-600 whitespace-pre-line">{message}</p>
              )}
              
              {children}
            </div>

            {/* Footer */}
            {(onConfirm || showCancel) && (
              <div className="flex gap-3 justify-end p-6 pt-4 border-t border-gray-200">
                {showCancel && (
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                  >
                    {cancelText}
                  </Button>
                )}
                
                {onConfirm && (
                  <Button
                    variant={variant === 'error' ? 'secondary' : 'primary'}
                    onClick={onConfirm}
                    loading={loading}
                    disabled={loading}
                  >
                    {confirmText}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

Dialog.displayName = 'Dialog';

// Alert Dialog (pre-configured for alerts)
interface AlertDialogProps extends Omit<DialogProps, 'variant' | 'showCancel' | 'onConfirm'> {
  onConfirm: () => void;
  confirmText?: string;
}

const AlertDialog = React.forwardRef<HTMLDivElement, AlertDialogProps>(
  (props, ref) => {
    return (
      <Dialog
        ref={ref}
        variant="alert"
        showCancel={false}
        {...props}
      />
    );
  }
);

AlertDialog.displayName = 'AlertDialog';

// Confirmation Dialog (pre-configured for confirmations)
interface ConfirmationDialogProps extends Omit<DialogProps, 'variant' | 'showCancel'> {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationDialog = React.forwardRef<HTMLDivElement, ConfirmationDialogProps>(
  (props, ref) => {
    return (
      <Dialog
        ref={ref}
        variant="alert"
        {...props}
      />
    );
  }
);

ConfirmationDialog.displayName = 'ConfirmationDialog';

// Fullscreen Dialog (like Android's fullscreen dialogs)
interface FullscreenDialogProps extends Omit<DialogProps, 'size'> {
  children: React.ReactNode;
}

const FullscreenDialog = React.forwardRef<HTMLDivElement, FullscreenDialogProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <Dialog
        ref={ref}
        size="fullscreen"
        showCloseButton={true}
        closeOnOverlayClick={false}
        className={`h-[calc(100vh-2rem)] flex flex-col ${className}`}
        {...props}
      />
    );
  }
);

FullscreenDialog.displayName = 'FullscreenDialog';

// Progress Dialog (for loading states)
interface ProgressDialogProps extends Omit<DialogProps, 'children' | 'showCancel' | 'onConfirm'> {
  message?: string;
}

const ProgressDialog = React.forwardRef<HTMLDivElement, ProgressDialogProps>(
  ({ message = 'Processing...', ...props }, ref) => {
    return (
      <Dialog
        ref={ref}
        showCloseButton={false}
        showCancel={false}
        closeOnOverlayClick={false}
        {...props}
      >
        <div className="flex items-center gap-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <p className="text-gray-600">{message}</p>
        </div>
      </Dialog>
    );
  }
);

ProgressDialog.displayName = 'ProgressDialog';

// API Key Dialog (specialized for API key input)
interface ApiKeyDialogProps extends Omit<DialogProps, 'children' | 'variant' | 'title' | 'message'> {
  onSave: (apiKey: string) => void;
  onGetKey: () => void;
  initialApiKey?: string;
}

const ApiKeyDialog = React.forwardRef<HTMLDivElement, ApiKeyDialogProps>(
  ({ onSave, onGetKey, initialApiKey = '', onClose, ...props }, ref) => {
    const [apiKey, setApiKey] = React.useState(initialApiKey);
    const [error, setError] = React.useState('');

    const handleSave = () => {
      if (!apiKey.trim()) {
        setError('Please enter an API key');
        return;
      }

      if (!apiKey.match(/^[A-Za-z0-9_-]{20,}$/)) {
        setError("Doesn't look like a valid API key");
        return;
      }

      onSave(apiKey);
    };

    return (
      <Dialog
        ref={ref}
        title="Gemini API Key Required"
        variant="alert"
        confirmText="Save"
        onConfirm={handleSave}
        onClose={onClose}
        {...props}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Please enter your Gemini API key to continue with the practice session.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError('');
              }}
              placeholder="Enter your Gemini API key..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <Button
            variant="outline"
            onClick={onGetKey}
            className="w-full"
          >
            Get API Key from Google AI Studio
          </Button>
        </div>
      </Dialog>
    );
  }
);

ApiKeyDialog.displayName = 'ApiKeyDialog';

export {
  Dialog,
  AlertDialog,
  ConfirmationDialog,
  FullscreenDialog,
  ProgressDialog,
  ApiKeyDialog,
};
