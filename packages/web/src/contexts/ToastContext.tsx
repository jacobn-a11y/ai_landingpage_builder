/**
 * Simple toast for user feedback (errors, success).
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface Toast {
  message: string;
  type: 'error' | 'success';
}

interface ToastContextValue {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const showError = useCallback((message: string) => {
    setToast({ message, type: 'error' });
    setTimeout(() => setToast(null), 6000);
  }, []);

  const showSuccess = useCallback((message: string) => {
    setToast({ message, type: 'success' });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showError, showSuccess }}>
      {children}
      {toast && (
        <div
          role="alert"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-[9999] max-w-sm px-4 py-3 rounded-lg shadow-lg border ${
            toast.type === 'error'
              ? 'bg-destructive/95 text-destructive-foreground border-destructive'
              : 'bg-primary/95 text-primary-foreground border-primary'
          }`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? { showError: () => {}, showSuccess: () => {} };
}
