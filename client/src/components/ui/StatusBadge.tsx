import React from 'react';
import { CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react';
import { CollectionStatus, TransactionStatus } from '../../types/wepay';

type AnyStatus = CollectionStatus | TransactionStatus;

const STATUS_STYLE: Record<
  AnyStatus,
  {
    label: string;
    classes: string;
    Icon: React.FC<{ className?: string }>;
  }
> = {
  ACTIVE: {
    label: 'Active',
    classes: 'bg-teal-50 text-teal-700 border-teal-200',
    Icon: CheckCircle2,
  },
  SUCCESS: {
    label: 'Success',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Icon: CheckCircle2,
  },
  COMPLETED: {
    label: 'Completed',
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    Icon: CheckCircle2,
  },
  SOLD_OUT: {
    label: 'Sold out',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    Icon: CheckCircle2,
  },
  PAUSED: {
    label: 'Paused',
    classes: 'bg-[#f59e08]/10 text-[#92400e] border-[#f59e08]/30',
    Icon: PauseCircle,
  },
  PENDING: {
    label: 'Pending',
    classes: 'bg-[#f59e08]/10 text-[#92400e] border-[#f59e08]/30',
    Icon: Clock,
  },
  FAILED: {
    label: 'Failed',
    classes: 'bg-red-50 text-red-700 border-red-200',
    Icon: XCircle,
  },
  CLOSED: {
    label: 'Closed',
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    Icon: XCircle,
  },
};

export const StatusBadge: React.FC<{ status: AnyStatus }> = ({ status }) => {
  const cfg = STATUS_STYLE[status] || STATUS_STYLE.PENDING;
  const Icon = cfg.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap shrink-0 ${cfg.classes}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
};
