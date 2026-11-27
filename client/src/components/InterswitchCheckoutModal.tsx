import React, { useState } from 'react';
import {
  Building2,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { getApiBaseUrl } from '../services/apiClient';
import { InterswitchCheckoutParams } from '../types/wepay';
import { formatNaira } from '../utils/formatters';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

declare global {
  interface Window {
    webpayCheckout?: (request: Record<string, unknown>) => void;
  }
}

interface InterswitchCheckoutModalProps {
  open: boolean;
  params: InterswitchCheckoutParams | null;
  collectionTitle: string;
  contributorEmail: string;
  onClose: () => void;
  onCompleteVerification: (outcome: 'SUCCESS' | 'FAILED' | 'PENDING') => Promise<void>;
}

type PaymentMethod = 'CARD' | 'TRANSFER' | 'USSD';

const ISW_SCRIPT_URLS: Record<InterswitchCheckoutParams['mode'], string> = {
  TEST: 'https://newwebpay-sandbox.interswitchng.com/inline-checkout.js',
  LIVE: 'https://newwebpay.interswitchng.com/inline-checkout.js',
};

const QA_TEST_CARD = {
  pan: '5060990580000217499',
  expiry: '03/50',
  cvv: '111',
  pin: '1111',
  otp: '123456',
};

const ensureInterswitchScript = (mode: InterswitchCheckoutParams['mode']): Promise<boolean> => {
  const scriptUrl = ISW_SCRIPT_URLS[mode];
  const existing = Array.from(document.scripts).find((script) => script.src === scriptUrl);
  if (typeof window.webpayCheckout === 'function' && existing) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    if (existing) {
      existing.addEventListener(
        'load',
        () => resolve(typeof window.webpayCheckout === 'function'),
        { once: true }
      );
      existing.addEventListener('error', () => resolve(false), { once: true });
      setTimeout(() => resolve(typeof window.webpayCheckout === 'function'), 4000);
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => resolve(typeof window.webpayCheckout === 'function');
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const InterswitchCheckoutModal: React.FC<InterswitchCheckoutModalProps> = ({
  open,
  params,
  collectionTitle,
  contributorEmail,
  onClose,
  onCompleteVerification,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('CARD');
  const [phase, setPhase] = useState<'SELECT' | 'LOADING_SDK' | 'GATEWAY_ACTIVE' | 'VERIFYING'>('SELECT');
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [copiedCard, setCopiedCard] = useState(false);

  if (!params) return null;

  const isRemoteGateway = !params.isSandboxSimulation;
  const isTestMode = params.mode === 'TEST';

  const handleCopyTestCard = async () => {
    try {
      await navigator.clipboard.writeText(QA_TEST_CARD.pan);
      setCopiedCard(true);
      setTimeout(() => setCopiedCard(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  };

  const handleLaunchInterswitch = async () => {
    setGatewayError(null);
    setPhase('LOADING_SDK');

    const sdkReady = await ensureInterswitchScript(params.mode);
    if (!sdkReady || typeof window.webpayCheckout !== 'function') {
      setPhase('SELECT');
      setGatewayError(`Could not load the Interswitch ${params.mode} checkout script. Check your network or try backend requery.`);
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      setPhase('SELECT');
      setGatewayError('The WePay API URL is not configured for the Interswitch return URL.');
      return;
    }

    setPhase('GATEWAY_ACTIVE');

    const paymentRequest = {
      merchant_code: params.merchantCode || 'MX6072',
      pay_item_id: params.payItemId || '9405967',
      txn_ref: params.txnRef,
      amount: String(params.amount),
      currency: 566,
      cust_email: contributorEmail || 'contributor@wepay.ng',
      site_redirect_url: new URL('/api/payments/redirect-return', apiBaseUrl).toString(),
      mode: params.mode,
      onComplete: async (response: Record<string, unknown>) => {
        const respCode = String(response?.resp || response?.ResponseCode || '');
        if (respCode === '00') {
          setPhase('VERIFYING');
          try {
            await onCompleteVerification('SUCCESS');
          } finally {
            setPhase('SELECT');
          }
        } else {
          setPhase('SELECT');
          setGatewayError(
            respCode
              ? `Interswitch gateway returned code ${respCode}. You can retry payment below.`
              : 'Checkout window closed before payment confirmation. You can retry below.'
          );
        }
      },
    };

    window.webpayCheckout(paymentRequest);
  };

  const handleManualRequery = async (outcome: 'SUCCESS' | 'FAILED' | 'PENDING') => {
    setGatewayError(null);
    setPhase('VERIFYING');
    try {
      await onCompleteVerification(outcome);
    } finally {
      setPhase('SELECT');
    }
  };

  if (open && phase === 'GATEWAY_ACTIVE') {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={phase === 'VERIFYING' || phase === 'LOADING_SDK' ? () => {} : onClose}
      title="Interswitch Web Checkout"
      description={
        isRemoteGateway
          ? params.mode === 'LIVE'
            ? 'Connected to Interswitch production IPG and verified via server-side requery.'
            : 'Connected to Interswitch sandbox IPG and verified via server-side requery.'
          : 'Local mock sandbox mode.'
      }
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs leading-relaxed">
          <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">
                {isRemoteGateway
                  ? `Interswitch ${params.mode} Gateway Ready`
                  : 'Offline Sandbox Mode'}
              </p>
              {isRemoteGateway && isTestMode && (
                <button
                  type="button"
                  onClick={handleCopyTestCard}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-medium cursor-pointer"
                >
                  {copiedCard ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedCard ? 'Copied PAN' : 'Copy Verve Test Card'}</span>
                </button>
              )}
            </div>
            {isRemoteGateway && isTestMode && (
              <p className="mt-1 font-mono-num text-[11px] text-emerald-900">
                Verve: {QA_TEST_CARD.pan} • Exp: {QA_TEST_CARD.expiry} • CVV: {QA_TEST_CARD.cvv} •
                PIN: {QA_TEST_CARD.pin} • OTP: {QA_TEST_CARD.otp}
              </p>
            )}
          </div>
        </div>

        {gatewayError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
            {gatewayError}
          </div>
        )}

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

        {phase === 'VERIFYING' || phase === 'LOADING_SDK' ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {phase === 'LOADING_SDK'
                  ? 'Connecting to Interswitch Quickteller Gateway...'
                  : 'Requerying Interswitch & issuing digital receipt...'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Reference: {params.txnRef}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'CARD', label: 'Verve / Card', Icon: CreditCard },
                  { id: 'TRANSFER', label: 'Bank Transfer', Icon: Building2 },
                  { id: 'USSD', label: 'Quickteller USSD', Icon: Smartphone },
                ] as const
              ).map(({ id, label, Icon }) => {
                const active = method === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMethod(id)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2.5 pt-1">
              {isRemoteGateway ? (
                <>
                  <Button fullWidth size="lg" onClick={handleLaunchInterswitch}>
                    <ExternalLink className="h-4 w-4" />
                    <span>Pay {formatNaira(params.amountNaira)} on Interswitch</span>
                  </Button>

                  <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">
                      Gateway blocked or already paid?
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManualRequery('SUCCESS')}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Verify via Backend Requery</span>
                    </Button>
                  </div>
                </>
              ) : (
                <Button fullWidth size="lg" onClick={() => handleManualRequery('SUCCESS')}>
                  <Lock className="h-4 w-4" />
                  <span>Simulate Verified Payment ({formatNaira(params.amountNaira)})</span>
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
