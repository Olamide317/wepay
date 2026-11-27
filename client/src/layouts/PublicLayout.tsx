import React from 'react';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WePayLogo } from '../components/WePayLogo';

interface PublicLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl';
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children, maxWidth = 'lg' }) => {
  const widthClass =
    maxWidth === 'md' ? 'max-w-xl' : maxWidth === 'xl' ? 'max-w-5xl' : 'max-w-3xl';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="no-print bg-white/95 border-b border-slate-200/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" aria-label="WePay Home">
            <WePayLogo size="sm" />
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
            <Lock className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>Secured checkout via Interswitch</span>
          </div>
        </div>
      </header>

      <main className={`flex-1 w-full ${widthClass} mx-auto px-4 sm:px-6 py-6 sm:py-10`}>
        {children}
      </main>

    </div>
  );
};
