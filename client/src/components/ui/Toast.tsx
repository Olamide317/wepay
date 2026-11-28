import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, variant });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 6500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const styles = {
    success: 'border-emerald-200 bg-white text-emerald-900',
    error: 'border-red-200 bg-white text-red-900',
    info: 'border-indigo-200 bg-white text-slate-900',
  };
  const Icon = toast?.variant === 'success'
    ? CheckCircle2
    : toast?.variant === 'error'
    ? AlertCircle
    : Info;
  const iconStyles = {
    success: 'text-emerald-600',
    error: 'text-red-600',
    info: 'text-indigo-600',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role={toast.variant === 'error' ? 'alert' : 'status'}
          aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
          className={`fixed bottom-4 right-4 z-[120] flex w-[min(420px,calc(100vw-2rem))] items-start gap-3 rounded-xl border px-4 py-3 shadow-xl ${styles[toast.variant]}`}
        >
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconStyles[toast.variant]}`} aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm leading-relaxed">{toast.message}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
