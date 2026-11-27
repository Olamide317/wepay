import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Layers, Package, Receipt, ShieldCheck, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { WePayLogo } from '../components/WePayLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [receiptCode, setReceiptCode] = useState('');
  const navigate = useNavigate();

  const handleReceiptLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptCode.trim()) return;
    navigate(`/receipt/${encodeURIComponent(receiptCode.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <Link to="/" aria-label="WePay Home" className="whitespace-nowrap shrink-0">
            <WePayLogo />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#modes"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Modes
            </a>
            <a
              href="#verify-receipt"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Receipts
            </a>
            <Link
              to="/login"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          </nav>

          <div className="shrink-0">
            <Link to={isAuthenticated ? '/dashboard' : '/register'}>
              <Button size="sm">
                <span>{isAuthenticated ? 'Open Dashboard' : 'Get Started'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
            <div className="max-w-3xl space-y-6">
              <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">
                Collective Commerce for Nigeria · NGN
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 text-balance leading-[1.12]">
                Collect group payments without sharing personal bank details.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                WePay gives organizers, student reps, and campus merchants one link to split bills,
                collect dues, and manage limited-stock pre-orders via Interswitch—with automated
                ledgers and QR-verified digital receipts.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link to={isAuthenticated ? '/dashboard' : '/login'}>
                  <Button size="lg">
                    <span>{isAuthenticated ? 'Go to Dashboard' : 'Organizer Sign In'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="outline" size="lg">
                    <span>Create Organizer Account</span>
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  No contributor account required
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Interswitch Web Checkout
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                  Instant QR receipts
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="modes" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              One unified engine, three collection modes
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Stop checking bank alerts and reconciling screenshots on WhatsApp. Pick the mode that
              fits how your group collects money.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div className="text-xs font-medium text-slate-500">Mode 1 · Target-capped</div>
                <h3 className="text-lg font-semibold text-slate-900">Bill Split / Group Pool</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Split shared bills, subscriptions, or group expenses toward a fixed target that
                  automatically closes once reached.
                </p>
              </div>
            </Card>

            <Card className="flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="text-xs font-medium text-slate-500">Mode 2 · Ongoing dues</div>
                <h3 className="text-lg font-semibold text-slate-900">Open Collection / Dues</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Collect departmental dues, association levies, or community contributions with
                  fixed, minimum, or flexible amounts and custom fields.
                </p>
              </div>
            </Card>

            <Card className="flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Package className="h-5 w-5" />
                </div>
                <div className="text-xs font-medium text-slate-500">Mode 3 · Stock-locked</div>
                <h3 className="text-lg font-semibold text-slate-900">Merchant Pre-Order</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Sell limited-batch items, merch, or tickets with real-time stock limits, quantity
                  selectors, and fulfillment questions.
                </p>
              </div>
            </Card>
          </div>
        </section>

        <section id="verify-receipt" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          <Card>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1 max-w-xl">
                <h2 className="text-lg font-semibold text-slate-900">
                  Verify or inspect a digital receipt
                </h2>
                <p className="text-sm text-slate-600">
                  Every completed contribution issues a QR-encoded WePay receipt for instant
                  verification during physical distribution or clearance.
                </p>
              </div>
              <form
                onSubmit={handleReceiptLookup}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto"
              >
                <input
                  type="text"
                  value={receiptCode}
                  onChange={(e) => setReceiptCode(e.target.value)}
                  placeholder="Enter receipt code"
                  aria-label="Receipt code"
                  className="h-10 px-3.5 rounded-lg border border-slate-200 bg-white text-sm font-mono-num text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 sm:w-64"
                />
                <Button type="submit" variant="secondary">
                  Inspect Receipt
                </Button>
              </form>
            </div>
          </Card>
        </section>
      </main>

    </div>
  );
};
