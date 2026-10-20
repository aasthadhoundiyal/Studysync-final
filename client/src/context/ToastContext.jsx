import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, type = 'info', duration = 3000 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const success = useCallback((message, duration) => showToast({ message, type: 'success', duration }), [showToast]);
  const error = useCallback((message, duration) => showToast({ message, type: 'error', duration }), [showToast]);
  const info = useCallback((message, duration) => showToast({ message, type: 'info', duration }), [showToast]);

  const value = { showToast, success, error, info, removeToast };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
    info: <Info className="w-4 h-4 text-brand-600 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-200/90 bg-white/95 text-surface-900',
    error: 'border-rose-200/90 bg-white/95 text-surface-900',
    info: 'border-brand-200/90 bg-white/95 text-surface-900',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Floating Toast Container */}
      <div
        aria-live="polite"
        className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-modal backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 duration-200 text-xs font-medium',
              borders[toast.type] || borders.info
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {icons[toast.type] || icons.info}
              <span className="truncate">{toast.message}</span>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors shrink-0 ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;
