import React from 'react';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WePayLogo } from './WePayLogo';
import { useAuth } from '../context/AuthContext';

export const Footer: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <footer className="no-print border-t border-slate-800 bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9 sm:py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(280px,1.6fr)_0.8fr_0.8fr] lg:gap-12">
          <div className="space-y-4">
            <Link to="/" aria-label="WePay Home">
              <WePayLogo variant="light" />
            </Link>
            <p className="max-w-sm text-sm leading-6 text-slate-300">
              Collective commerce, group payments, and verified receipts — organized in one place.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/[0.07] px-3 py-1.5 text-xs font-medium text-teal-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Secured payments via Interswitch</span>
            </div>
          </div>

          <nav aria-label="Product links" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Product</p>
            <div className="flex flex-col items-start gap-2.5">
              <Link to="/" className="group inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white transition-colors">
                Overview
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" aria-hidden="true" />
              </Link>
              <Link to="/dashboard/collections" className="text-sm text-slate-300 hover:text-white transition-colors">
                Collections
              </Link>
              <Link to="/dashboard/transactions" className="text-sm text-slate-300 hover:text-white transition-colors">
                Transactions
              </Link>
            </div>
          </nav>

          <nav aria-label="Account links" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Account</p>
            <div className="flex flex-col items-start gap-2.5">
              {!isAuthenticated && (
                <Link to="/login" className="text-sm text-slate-300 hover:text-white transition-colors">
                  Sign in
                </Link>
              )}
              <Link to="/register" className="text-sm text-slate-300 hover:text-white transition-colors">
                {isAuthenticated ? 'Create new account' : 'Create account'}
              </Link>
              <Link to="/dashboard/profile" className="text-sm text-slate-300 hover:text-white transition-colors">
                Profile
              </Link>
            </div>
          </nav>
        </div>

        <div className="mt-8 pt-5 border-t border-slate-800 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} WePay. All rights reserved.</p>
          <p>Nigerian Naira (NGN) · Built for collective payments</p>
        </div>
      </div>
    </footer>
  );
};
