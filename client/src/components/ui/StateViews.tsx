import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from './Button';

export const LoadingRows: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3 py-2" aria-busy="true" aria-label="Loading content">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-11 rounded-lg bg-slate-100 animate-pulse" />
    ))}
  </div>
);

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, description, actionLabel, onAction }) => (
  <div className="py-12 px-6 text-center flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-900/15">
    <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    <p className="text-sm text-slate-500 max-w-md mt-1.5 leading-relaxed">{description}</p>
    {actionLabel && onAction && (
      <div className="mt-5">
        <Button onClick={onAction}>{actionLabel}</Button>
      </div>
    )}
  </div>
);

export const AlertBanner: React.FC<{
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  action?: React.ReactNode;
}> = ({ variant = 'info', title, message, action }) => {
  const styles = {
    info: 'bg-slate-50 border-slate-200 text-slate-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-[#f59e08]/10 border-[#f59e08]/30 text-[#92400e]',
    error: 'bg-red-50 border-red-200 text-red-900',
  };

  const Icon =
    variant === 'success' ? CheckCircle2 : variant === 'info' ? Info : AlertCircle;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${styles[variant]}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          {title && <p className="font-semibold">{title}</p>}
          <p className="text-xs sm:text-sm leading-relaxed opacity-90">{message}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
