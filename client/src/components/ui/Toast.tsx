import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
<<<<<<< HEAD
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';
=======
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
<<<<<<< HEAD
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
=======
  visible: boolean;
  exiting: boolean;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-white text-red-800',
  warning: 'border-[#f59e08]/30 bg-[#f59e08]/10 text-[#92400e]',
  info: 'border-[#0f172a]/15 bg-white text-[#0f172a]',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());
  const activeKeys = useRef(new Set<string>());
  const keysById = useRef(new Map<number, string>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);

    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, exiting: true } : message))
    );

    const exitTimer = window.setTimeout(() => {
      timers.current.delete(id);
      const key = keysById.current.get(id);
      if (key) activeKeys.current.delete(key);
      keysById.current.delete(id);
      setMessages((current) => current.filter((message) => message.id !== id));
    }, 180);
    timers.current.set(id, exitTimer);
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const key = JSON.stringify([variant, message]);
    if (activeKeys.current.has(key)) return;

    const id = ++nextId.current;
    activeKeys.current.add(key);
    keysById.current.set(id, key);
    setMessages((current) => [...current, { id, message, variant, visible: false, exiting: false }]);
    window.requestAnimationFrame(() => {
      setMessages((current) =>
        current.map((item) => (item.id === id ? { ...item, visible: true } : item))
      );
    });
    timers.current.set(id, window.setTimeout(() => dismiss(id), 4500));
  }, [dismiss]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-5 sm:top-5"
      >
        {messages.map((item) => {
          const Icon =
            item.variant === 'success'
              ? CheckCircle2
              : item.variant === 'error'
              ? AlertCircle
              : item.variant === 'warning'
              ? TriangleAlert
              : Info;
          return (
            <div
              key={item.id}
              role={item.variant === 'error' ? 'alert' : 'status'}
              aria-atomic="true"
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-black/10 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-opacity ${
                item.visible && !item.exiting
                  ? 'translate-y-0 scale-100 opacity-100'
                  : '-translate-y-2 scale-[0.98] opacity-0'
              } ${variantStyles[item.variant]}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="flex-1 text-sm font-medium leading-5">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
<<<<<<< HEAD
  if (!context) throw new Error('useToast must be used within a ToastProvider');
=======
  if (!context) throw new Error('useToast must be used within ToastProvider');
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4
  return context;
}
