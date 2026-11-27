import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  FolderKanban,
  Layers,
  Link2,
  MessageSquareWarning,
  Receipt,
  Share2,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const PROBLEMS = [
  {
    title: 'Account Number Chaos',
    description:
      'Organizers often share personal bank account details in group chats, mixing personal finances with group money and making reconciliation difficult.',
    Icon: Wallet,
    tone: 'bg-red-50 text-red-600',
  },
  {
    title: 'Screenshot Reconciliation',
    description:
      'Contributors send debit alert screenshots, while organizers manually check transfers, update lists and try to determine who has paid.',
    Icon: AlertTriangle,
    tone: 'bg-amber-50 text-amber-600',
  },
  {
    title: 'Awkward Follow-ups',
    description:
      'Organizers repeatedly message people who haven’t contributed, while contributors may have no proper proof that their payments were received.',
    Icon: MessageSquareWarning,
    tone: 'bg-indigo-50 text-indigo-600',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Create a Collection',
    description:
      'An organizer signs up, creates a collection, chooses the collection mode and configures the payment details and custom contributor fields.',
    Icon: Layers,
  },
  {
    number: '02',
    title: 'Share the Link',
    description:
      'WePay generates a unique payment link that the organizer can share in WhatsApp groups and other communication channels.',
    Icon: Share2,
  },
  {
    number: '03',
    title: 'Contributors Pay',
    description:
      'Contributors open the link directly from their phones without creating an account or downloading an application. They can pay through supported Interswitch checkout methods, including cards, bank transfer and USSD, subject to payment integration availability.',
    Icon: Smartphone,
  },
  {
    number: '04',
    title: 'Track Payments Automatically',
    description:
      'Once payment is verified by the backend, WePay updates the collection progress, records the contributor’s payment status and generates a digital receipt.',
    Icon: FileCheck2,
  },
];

const BENEFITS = [
  {
    title: 'Simple Collection Management',
    description:
      'Keep group contributions organized in one place instead of scattered across chats and personal bank accounts.',
    Icon: FolderKanban,
  },
  {
    title: 'Automatic Payment Tracking',
    description:
      'Know who has paid and who is still pending without manually reconciling screenshots.',
    Icon: CreditCard,
  },
  {
    title: 'Verified Digital Receipts',
    description:
      'Contributors receive payment confirmation and digital proof of successful transactions after backend verification.',
    Icon: Receipt,
  },
  {
    title: 'Easy Sharing',
    description:
      'Share one collection link with everyone. Contributors can access the payment page without creating an account.',
    Icon: Link2,
  },
];

export const ProductOverviewPage: React.FC = () => {
  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="overview-top" className="space-y-12 pb-6">
      {/* SECTION A: HERO SECTION */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 lg:p-10">
        <div className="max-w-3xl space-y-5">
          <p className="text-xs font-semibold tracking-wider uppercase text-indigo-600">
            WePay Platform Overview
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-slate-900 leading-[1.12] text-balance">
            Group Payments. Finally, Under Control.
          </h1>
          <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
            WePay makes collecting money from groups simple. Create a payment link, share it with
            your group, track contributions automatically and issue verified digital receipts — all
            from one place.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link to="/dashboard">
              <Button size="lg">
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button type="button" variant="outline" size="lg" onClick={scrollToHowItWorks}>
              <span>Explore How It Works</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              No account required for contributors
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Built for Nigerian Naira (₦) collections
            </span>
          </div>
        </div>
      </section>

      {/* SECTION B: THE PROBLEM WE SOLVE */}
      <section className="space-y-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            The Problem We Solve
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Group Collections Shouldn&apos;t Be This Complicated.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Whether you are splitting a shared subscription, coordinating class dues, or funding a
            celebration, collecting money in Nigeria usually ends up buried in group chat threads.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {PROBLEMS.map(({ title, description, Icon, tone }) => (
            <Card key={title} padding="lg" className="space-y-3 hover:border-slate-300 transition-colors">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* SECTION C: HOW WEPAY WORKS */}
      <section id="how-it-works" className="scroll-mt-20 space-y-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            How WePay Works
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            From Group Chat to Organized Payments in Four Simple Steps.
          </h2>
        </div>

        <div className="relative">
          {/* Desktop horizontal connector line behind step badges */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute top-11 left-12 right-12 h-px bg-slate-200 z-0"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
            {STEPS.map(({ number, title, description, Icon }) => (
              <Card
                key={number}
                padding="md"
                className="flex flex-col space-y-3 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white font-mono-num text-sm font-bold flex items-center justify-center">
                    {number}
                  </div>
                  <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION D: TWO COLLECTION MODES */}
      <section className="space-y-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Collection Modes
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            One Platform. Different Ways to Collect.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Pick the collection rule that matches your group—whether everyone contributes a defined
            amount toward a goal or gives flexibly at their own pace.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* BILL SPLIT — SPLIT MODE */}
          <Card padding="lg" className="space-y-5 flex flex-col justify-between border-indigo-200">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Bill Split — Pool Mode
                  </p>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    Structured Target Collections
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              <p className="text-sm font-medium text-slate-800">
                &ldquo;Perfect for shared expenses where everyone has an expected contribution.&rdquo;
              </p>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Common Examples
                </p>
                <p className="text-sm text-slate-600">
                  Class dinners · Group trips · Airbnb bookings · Aso-ebi · Uniform dues · Shared
                  subscriptions
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-xs font-semibold text-slate-900">How it works</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The organizer sets a target pool amount and configures the expected contribution
                  (fixed or minimum per contributor). WePay tracks total raised, displays paid and
                  pending transactions, and automatically completes the collection once the target is
                  reached.
                </p>
              </div>

              <ul className="space-y-2 text-sm text-slate-700 pt-1">
                {[
                  'Defined fixed or minimum contribution amounts',
                  'Target pool progress bar and remaining balance',
                  'Paid, pending, and failed status tracking',
                  'Custom contributor fields (e.g. Room label, Matric no)',
                  'Shareable link and QR code for easy group follow-ups',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* OPEN POOL — FLEXIBLE MODE */}
          <Card padding="lg" className="space-y-5 flex flex-col justify-between border-emerald-200">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Open Pool — Flexible Mode
                  </p>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    Open &amp; Flexible Contributions
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Layers className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              <p className="text-sm font-medium text-slate-800">
                &ldquo;Perfect for collections where everyone can contribute according to their
                ability.&rdquo;
              </p>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Common Examples
                </p>
                <p className="text-sm text-slate-600">
                  Birthday celebrations · Weddings · Burials · Class welfare · Community support ·
                  Group gifts
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-xs font-semibold text-slate-900">How it works</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The organizer creates an open collection with flexible, minimum, or fixed pricing,
                  adds any custom fields (such as an optional note or address), and shares one link
                  so contributors can give without creating an account.
                </p>
              </div>

              <ul className="space-y-2 text-sm text-slate-700 pt-1">
                {[
                  'Flexible any-amount, minimum, or fixed Naira rules',
                  'Custom contributor fields for optional notes or details',
                  'Real-time organizer ledger and CSV transaction export',
                  'Verified digital QR receipts for successful payments',
                  'Optional deadline / expiry date configuration',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        <p className="text-xs text-slate-500">
          Need to sell limited-quantity items like event tickets or merchandise? You can also select{' '}
          <strong className="font-semibold text-slate-700">Merchant Pre-Order</strong> inside Create
          Collection.
        </p>
      </section>

      {/* SECTION E: WHY WEPAY? */}
      <section className="space-y-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Why WePay?
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            More Than a Payment Link. A Better Way to Organize Group Money.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map(({ title, description, Icon }) => (
            <Card key={title} padding="md" className="space-y-3 hover:border-slate-300 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* SECTION F: CALL TO ACTION */}
      <section className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-balance">
            Ready to Make Your Next Group Collection Easier?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Create your first collection, share one link and let WePay handle the tracking.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link to="/dashboard">
              <Button size="lg">
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center justify-center gap-2 px-5 h-12 rounded-lg text-base font-medium border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowUp className="h-4 w-4" />
              <span>Back to Top</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
