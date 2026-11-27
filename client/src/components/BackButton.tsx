import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  className?: string;
  compact?: boolean;
}

export const BackButton: React.FC<BackButtonProps> = ({ className = '', compact = false }) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label="Go to previous page"
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 text-sm font-medium text-slate-600 shadow-sm transition-[background-color,color,transform] duration-150 hover:bg-white hover:text-slate-900 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${className}`}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className={compact ? 'hidden sm:inline' : ''}>Back</span>
    </button>
  );
};
