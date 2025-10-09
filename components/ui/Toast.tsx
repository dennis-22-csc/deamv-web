import React, { useEffect, useState } from 'react';
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  Bell
} from 'lucide-react';

interface ToastProps {
  id?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'default';
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  showClose?: boolean;
  onClose?: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const Toast: React.FC<ToastProps> = ({
  id = Math.random().toString(36).substr(2, 9),
  message,
  type = 'default',
  duration = 4000,
  position = 'bottom-center',
  showClose = true,
  onClose,
  action,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    // Auto dismiss after duration
    const dismissTimer = duration > 0 ? setTimeout(() => {
      handleClose();
    }, duration) : null;

    return () => {
      clearTimeout(enterTimer);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.(id);
    }, 300);
  };

  const handleActionClick = () => {
    action?.onClick();
    handleClose();
  };

  const typeIcons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    default: Bell,
  };

  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    default: 'bg-gray-50 border-gray-200 text-gray-800',
  };

  const iconStyles = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
    default: 'text-gray-500',
  };

  const IconComponent = typeIcons[type];

  const positionStyles = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  };

  const baseStyles = `
    fixed z-50 max-w-sm w-full mx-auto
    border rounded-lg shadow-lg
    transition-all duration-300 ease-in-out
    ${positionStyles[position]}
    ${isVisible && !isLeaving ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 scale-95'}
    ${isLeaving ? 'opacity-0 translate-y-2 scale-95' : ''}
  `;

  const contentStyles = `
    flex items-start gap-3 p-4
    ${typeStyles[type]}
  `;

  if (!isVisible && isLeaving) return null;

  return (
    <div className={baseStyles}>
      <div className={contentStyles}>
        {/* Icon */}
        <IconComponent className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconStyles[type]}`} />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">{message}</p>
          
          {/* Action Button */}
          {action && (
            <button
              onClick={handleActionClick}
              className="mt-2 text-sm font-semibold hover:underline focus:outline-none focus:underline"
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Close Button */}
        {showClose && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20 transition-colors"
            aria-label="Close toast"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress Bar (for auto-dismiss) */}
      {duration > 0 && (
        <div className="w-full h-1 bg-current bg-opacity-20 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-current bg-opacity-40 transition-all duration-300 ease-linear"
            style={{
              width: isLeaving ? '100%' : '0%',
              transitionDuration: `${duration}ms`,
            }}
          />
        </div>
      )}
    </div>
  );
};

// Toast Container to manage multiple toasts
interface ToastContainerProps {
  toasts: ToastProps[];
  onRemoveToast: (id: string) => void;
  position?: ToastProps['position'];
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemoveToast,
  position = 'bottom-center',
}) => {
  return (
    <div className="fixed z-50">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          position={position}
          onClose={onRemoveToast}
        />
      ))}
    </div>
  );
};

// Toast Hook for easy usage
interface UseToastReturn {
  toasts: ToastProps[];
  showToast: (props: Omit<ToastProps, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = (props: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...props, id };
    
    setToasts(prev => [...prev, newToast]);
    
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  return {
    toasts,
    showToast,
    removeToast,
    clearToasts,
  };
};

// Pre-configured toast functions
const createToastHelpers = (showToast: UseToastReturn['showToast']) => ({
  success: (message: string, options?: Omit<ToastProps, 'message' | 'type' | 'id'>) => 
    showToast({ message, type: 'success', ...options }),
  
  error: (message: string, options?: Omit<ToastProps, 'message' | 'type' | 'id'>) => 
    showToast({ message, type: 'error', ...options }),
  
  warning: (message: string, options?: Omit<ToastProps, 'message' | 'type' | 'id'>) => 
    showToast({ message, type: 'warning', ...options }),
  
  info: (message: string, options?: Omit<ToastProps, 'message' | 'type' | 'id'>) => 
    showToast({ message, type: 'info', ...options }),
  
  default: (message: string, options?: Omit<ToastProps, 'message' | 'type' | 'id'>) => 
    showToast({ message, type: 'default', ...options }),
});

export { 
  Toast, 
  ToastContainer, 
  useToast, 
  createToastHelpers 
};
export type { ToastProps };
