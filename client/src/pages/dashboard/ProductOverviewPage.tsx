import React from 'react';
import { ArrowRight, ArrowUp, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import fundImage from '../../assets/images/fund.jpg';

const STEPS = [
  {
    number: '01',
    title: 'Create a Collection',
    description:
      'An organizer signs up, creates a collection, chooses the collection mode and configures the payment details and custom contributor fields.',
  },
  {
    number: '02',
    title: 'Share the Link',
    description:
      'WePay generates a unique payment link that the organizer can share in WhatsApp groups and other communication channels.',
  },
  {
    number: '03',
    title: 'Contributors Pay',
    description:
      'Contributors open the link directly from their phones without creating an account or downloading an application. They can pay through supported Interswitch checkout methods, including cards, bank transfer and USSD, subject to payment integration availability.',
  },
  {
    number: '04',
    title: 'Track Payments Automatically',
    description:
      'Once payment is verified by the backend, WePay updates the collection progress, records the contributor’s payment status and generates a digital receipt.',
  },
];

const BENEFITS = [
  {
    title: 'Keep collections organized',
    description:
      'Keep group money separate from personal accounts and scattered chat messages.',
  },
  {
    title: 'Track payments automatically',
    description:
      'See paid, pending, and failed payments in one ledger—without reconciling screenshots.',
  },
  {
    title: 'Give contributors proof',
    description:
      'Successful payments receive a verifiable digital receipt, including a QR code.',
  },
  {
    title: 'Make contributing simple',
    description:
      'Share one payment link. Contributors can pay without creating an account.',
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
    <div id="overview-top" className="space-y-14 pb-8">
      {/* SECTION A: HERO SECTION */}
      <section
        className="rounded-2xl border border-slate-200 bg-cover bg-center p-7 shadow-lg shadow-slate-900/15 sm:p-10 lg:p-14"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(255, 255, 255, 0.99) 0%, rgba(255, 255, 255, 0.96) 45%, rgba(255, 255, 255, 0.58) 100%), url(${fundImage})`,
        }}
      >
        <div className="max-w-3xl space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            Collective Payments, Made Easier
          </p>
          <h1 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-slate-950 text-balance sm:text-4xl lg:text-[42px]">
            Track every kobo. No wahala.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-600">
            Create one payment link for group bills, dues, or pre-orders. WePay tracks contributions
            and gives successful payments a digital receipt you can verify.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link to="/dashboard">
              <Button size="lg">
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button type="button" variant="outline" size="lg" onClick={scrollToHowItWorks}>
              <span>See how it works</span>
            </Button>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-700" />
              No contributor account needed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-700" />
              SHA-256 receipt verification
            </span>
          </div>
        </div>
      </section>

      {/* SECTION B: HOW WEPAY WORKS */}
      <section id="how-it-works" className="mx-auto max-w-3xl scroll-mt-20 space-y-5 text-center">
        <div className="mx-auto max-w-2xl space-y-2">
          <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            How WePay works
          </h2>
        </div>

        <ol className="mx-auto max-w-3xl border-l border-teal-200 text-left">
          {STEPS.map(({ number, title, description }, index) => (
            <li
              key={number}
              className={`relative pl-8 ${index < STEPS.length - 1 ? 'pb-7' : ''}`}
            >
              <span className="absolute -left-[13px] top-0 flex h-7 w-7 items-center justify-center rounded-full border border-teal-200 bg-white font-mono-num text-[11px] font-semibold text-teal-700">
                {number}
              </span>
              <div className="space-y-2 border-b border-slate-200 pb-6">
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* SECTION D: COLLECTION MODES */}
      <section className="space-y-5">
        <div className="max-w-2xl space-y-2">
          <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Choose how you collect
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Pick a format that fits your group, from a shared target to flexible contributions or
            limited-stock orders.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* BILL SPLIT — SPLIT MODE */}
          <Card
            padding="lg"
            className="flex flex-col justify-between gap-5 shadow-lg shadow-slate-900/10"
          >
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                  POOL
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-slate-900">
                  Group contribution
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                For shared expenses with a target and fixed or minimum contributions. Useful for
                trips, class dinners, Aso-ebi, dues, and shared subscriptions.
              </p>
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
                {[
                  'Track target progress, remaining balance, and payment statuses',
                  'Add custom contributor fields',
                  'Share a link or QR code',
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <Link
              to="/dashboard/create?type=POOL"
              className="inline-flex items-center text-sm font-semibold text-teal-800 hover:text-teal-900"
            >
              <span>Start group pool</span>
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Card>

          {/* OPEN POOL — FLEXIBLE MODE */}
          <Card
            padding="lg"
            className="flex flex-col justify-between gap-5 shadow-lg shadow-slate-900/10"
          >
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                  OPEN
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-slate-900">
                  Flexible contributions
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                For celebrations, welfare, community support, and group gifts. Contributors give
                what they can, with flexible, minimum, or fixed pricing.
              </p>
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
                {[
                  'Add optional notes or contributor details',
                  'View a live ledger and export transactions to CSV',
                  'Issue verified QR receipts and set an optional deadline',
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <Link
              to="/dashboard/create?type=OPEN"
              className="inline-flex items-center text-sm font-semibold text-teal-800 hover:text-teal-900"
            >
              <span>Start open contribution</span>
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Card>

          <Card
            padding="lg"
            className="flex flex-col justify-between gap-5 shadow-lg shadow-slate-900/10"
          >
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                  INVENTORY
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-slate-900">
                  Stock-limited orders
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Sell tickets, merchandise, or other limited batches. Set unit price, stock, and
                order quantity; customers can provide fulfillment details when they pay.
              </p>
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
                {[
                  'Show live stock and limit quantities per order',
                  'Ask custom fulfillment questions',
                  'Track payments in the ledger and issue digital receipts',
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <Link
              to="/dashboard/create"
              className="text-sm font-semibold text-teal-800 hover:text-teal-900"
            >
              Create a pre-order <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" />
            </Link>
          </Card>
        </div>
      </section>

      {/* SECTION C: KEY BENEFITS */}
      <section className="mx-auto max-w-3xl space-y-5 text-center">
        <div className="mx-auto max-w-2xl space-y-2">
          <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Why WePay?
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
            Everything organizers and contributors need to keep group payments moving.
          </p>
        </div>

        <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-4">
          {BENEFITS.map(({ title, description }) => (
            <Card
              key={title}
              padding="lg"
              className="space-y-2.5 text-center shadow-lg shadow-slate-900/10"
            >
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* SECTION E: CALL TO ACTION */}
      <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
        <div className="max-w-xl space-y-2">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Ready to Make Your Next Group Contribution Easier?
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
            Create your first collection, share one link and let WePay handle the tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/dashboard">
            <Button size="lg">
              <span>Go to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
            <span>Top</span>
          </button>
        </div>
      </section>
    </div>
  );
};
