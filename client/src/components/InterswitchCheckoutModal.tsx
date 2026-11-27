import React, { useState } from 'react';
import { Building2, CreditCard, Lock, RefreshCw, ShieldAlert, Smartphone } from 'lucide-react';
import { InterswitchCheckoutParams } from '../types/wepay';
import { formatNaira } from '../utils/formatters';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface InterswitchCheckoutModalProps {
  open: boolean;
  params: InterswitchCheckoutParams | null;
  collectionTitle: string;
  contributorEmail: string;
  onClose: () => void;
  onCompleteVerification: (outcome: 'SUCCESS' | 'FAILED' | 'PENDING') => Promise<void>;
}

type PaymentMethod = 'CARD' | 'TRANSFER' | 'USSD';

export const InterswitchCheckoutModal: React.FC<InterswitchCheckoutModalProps> = ({
  open,
  params,
  collectionTitle,
  contributorEmail,
  onClose,
  onCompleteVerification,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('CARD');
  const [phase, setPhase] = useState<'SELECT' | 'VERIFYING'>('SELECT');

  if (!params) return null;

  const handleSimulate = async (outcome: 'SUCCESS' | 'FAILED' | 'PENDING') => {
    setPhase('VERIFYING');
    try {
      await onCompleteVerification(outcome);
    } finally {
      setPhase('SELECT');
    }
  };

  return (
    <Modal
      open={open}
      onClose={phase === 'VERIFYING' ? () => {} : onClose}
      title="Interswitch Web Checkout"
      description="Sandbox UI demonstration — backend requery remains the source of truth."
      size="md"
    >
      <div className="space-y-5">
        {/* Explicit Sandbox Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
          <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold">Sandbox Simulation Mode</p>
            <p className="mt-0.5">
              Live Interswitch merchant credentials are not configured in this frontend prototype.
              Completing a payment here triggers a simulated backend verification requery rather
              than a live bank charge.
            </p>
          </div>
        </div>

        {/* Summary Header */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="truncate max-w-[220px]">{collectionTitle}</span>
            <span className="font-mono-num">{contributorEmail}</span>
          </div>
          <div className="flex items-baseline justify-between pt-1 border-t border-slate-200">
            <span className="text-sm font-medium text-slate-700">Total Payable</span>
            <span className="text-2xl font-bold font-mono-num text-slate-900">
              {formatNaira(params.amountNaira)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Contribution: {formatNaira(params.baseAmountNaira)}</span>
            <span>Processing fee: {formatNaira(params.feeAmountNaira)}</span>
          </div>
        </div>

        {/* Backend-returned checkout payload inspection */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900 text-slate-200 p-3.5 rounded-lg font-mono-num">
          <div>
            <span className="text-slate-400 block">txnRef</span>
            <span className="truncate block">{params.txnRef}</span>
          </div>
          <div>
            <span className="text-slate-400 block">amount (kobo)</span>
            <span>{params.amount.toLocaleString('en-NG')}</span>
          </div>
          <div>
            <span className="text-slate-400 block">merchantCode</span>
            <span>{params.merchantCode}</span>
          </div>
          <div>
            <span className="text-slate-400 block">payItemId</span>
            <span>{params.payItemId}</span>
          </div>
        </div>

        {phase === 'VERIFYING' ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Verifying payment with WePay backend...
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Awaiting transaction requery confirmation before issuing receipt.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Payment Channel Tabs */}
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-slate-600">Select Sandbox Payment Channel</p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'CARD', label: 'Debit Card', Icon: CreditCard },
                    { id: 'TRANSFER', label: 'Transfer', Icon: Building2 },
                    { id: 'USSD', label: 'USSD', Icon: Smartphone },
                  ] as const
                ).map(({ id, label, Icon }) => {
                  const active = method === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMethod(id)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 text-xs text-slate-600 bg-white">
              {method === 'CARD' && (
                <p>
                  Interswitch Inline Card Prompt: Enter test Verve, Mastercard, or Visa credentials
                  in live integration. No card input is stored here.
                </p>
              )}
              {method === 'TRANSFER' && (
                <p>
                  Pay with Bank Transfer: Interswitch generates a one-time dynamic virtual account
                  for exact settlement of {formatNaira(params.amountNaira)}.
                </p>
              )}
              {method === 'USSD' && (
                <p>
                  Pay with Bank USSD: Dial bank quick-code generated by Interswitch Quickteller for
                  reference <span className="font-mono-num font-medium">{params.txnRef}</span>.
                </p>
              )}
            </div>

            {/* Simulation Controls */}
            <div className="space-y-2.5 pt-1">
              <Button
                fullWidth
                size="lg"
                onClick={() => handleSimulate('SUCCESS')}
              >
                <Lock className="h-4 w-4" />
                <span>Simulate Verified Payment ({formatNaira(params.amountNaira)})</span>
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSimulate('PENDING')}
                >
                  Simulate Pending State
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSimulate('FAILED')}
                  className="text-red-700 hover:text-red-800 hover:bg-red-50 border-red-200"
                >
                  Simulate Failed Payment
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
