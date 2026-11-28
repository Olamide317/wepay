import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
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
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
