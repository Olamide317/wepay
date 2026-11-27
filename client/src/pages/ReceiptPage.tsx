import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useParams } from 'react-router-dom';
import { WePayLogo } from '../components/WePayLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingRows } from '../components/ui/StateViews';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PublicLayout } from '../layouts/PublicLayout';
import { wepayService } from '../services/wepayService';
import { ReceiptData } from '../types/wepay';
import { formatCustomAnswerValue, formatDate, formatNaira } from '../utils/formatters';

export const ReceiptPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReceipt = async (isRefresh = false) => {
    if (!code) {
      setError('Missing receipt code.');
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await wepayService.getReceipt(code);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Receipt not found.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReceipt(false);
  }, [code]);

  const handleVerifyNow = async () => {
    if (!data || !code) return;
    setRefreshing(true);
    setError(null);
    try {
      const updated = await wepayService.verifyPaymentAndGetReceipt(
        data.transaction.txnRef,
        code
      );
      setData(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify payment status.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!data) return;
    const { transaction: tx, collection } = data;
    const customAnswerRows =
      tx.customFieldAnswers && tx.customFieldAnswers.length > 0
        ? tx.customFieldAnswers.map((a) => ({
            label: a.label,
            value: formatCustomAnswerValue(a.value),
          }))
        : tx.customResponses
        ? Object.entries(tx.customResponses).map(([k, v]) => ({
            label: k,
            value: formatCustomAnswerValue(v),
          }))
        : [];

    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>WePay Receipt ${tx.receiptCode}</title>
<style>
  body { font-family: system-ui, sans-serif; color: #0f172a; max-width: 560px; margin: 40px auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .muted { color: #64748b; font-size: 13px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; gap: 16px; }
  .total { font-weight: 700; font-size: 16px; }
</style></head><body>
  <h1>WePay Digital Receipt</h1>
  <p class="muted">Status: ${tx.status}</p>
  <div class="row"><span>Receipt Code</span><strong>${tx.receiptCode}</strong></div>
  <div class="row"><span>Collection</span><span>${collection.title}</span></div>
  <div class="row"><span>Contributor</span><span>${tx.contributorName} (${tx.contributorEmail})</span></div>
  ${customAnswerRows
    .map((r) => `<div class="row"><span>${r.label}</span><span>${r.value}</span></div>`)
    .join('')}
  <div class="row"><span>Transaction Ref</span><span>${tx.txnRef}</span></div>
  ${tx.interswitchRef ? `<div class="row"><span>Interswitch Ref</span><span>${tx.interswitchRef}</span></div>` : ''}
  <div class="row"><span>Amount Contributed</span><span>${formatNaira(tx.baseAmount)}</span></div>
  <div class="row"><span>Processing Fee</span><span>${formatNaira(tx.feeAmount)}</span></div>
  <div class="row total"><span>Total Paid</span><span>${formatNaira(tx.totalPaid)}</span></div>
  <div class="row"><span>Date</span><span>${formatDate(tx.paidAt || tx.createdAt, true)}</span></div>
  ${tx.receiptHash ? `<div class="row"><span>Receipt Hash</span><span>${tx.receiptHash}</span></div>` : ''}
</body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WePay-Receipt-${tx.receiptCode}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <PublicLayout maxWidth="md">
        <Card>
          <LoadingRows rows={6} />
        </Card>
      </PublicLayout>
    );
  }

  if (error || !data) {
    return (
      <PublicLayout maxWidth="md">
        <Card padding="lg" className="text-center space-y-4">
          <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="font-display text-xl font-bold text-slate-900">Invalid Receipt</h1>
            <p className="text-sm text-slate-600">
              {error || 'No receipt record matches this code.'}
            </p>
          </div>
          <div className="pt-2">
            <Link to="/">
              <Button variant="outline">Return to WePay</Button>
            </Link>
          </div>
        </Card>
      </PublicLayout>
    );
  }

  const { transaction: tx, collection } = data;
  const receiptUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/receipt/${tx.receiptCode}`
      : `/receipt/${tx.receiptCode}`;

  return (
    <PublicLayout maxWidth="md">
      <div className="space-y-4">
        {/* Top Action Bar (hidden when printing) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2">
          <Link
            to={collection.slug ? `/c/${collection.slug}` : '/'}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Collection</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadReceipt}>
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </Button>
          </div>
        </div>

        {/* Receipt Card */}
        <Card padding="lg" className="print-only-card space-y-6">
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="space-y-1">
              <WePayLogo size="sm" />
              <p className="text-xs text-slate-500 pt-1">Official Collection Receipt</p>
            </div>
            <StatusBadge status={tx.status} />
          </div>

          {/* Status Hero */}
          <div className="flex items-start gap-3">
            {tx.status === 'SUCCESS' ? (
              <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            ) : tx.status === 'PENDING' ? (
              <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <XCircle className="h-6 w-6" />
              </div>
            )}
            <div className="space-y-1">
              <h1 className="font-display text-xl font-bold text-slate-900">
                {tx.status === 'SUCCESS'
                  ? formatNaira(tx.totalPaid)
                  : tx.status === 'PENDING'
                  ? 'Payment Confirmation Pending'
                  : 'Payment Failed'}
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                {tx.status === 'SUCCESS'
                  ? `Recorded for ${collection.title} (${collection.organizerName}).`
                  : tx.status === 'PENDING'
                  ? 'Awaiting backend confirmation from Interswitch transaction requery.'
                  : 'This transaction did not complete. No verified contribution was recorded.'}
              </p>
            </div>
          </div>

          {tx.status === 'PENDING' && (
            <div className="no-print flex flex-wrap gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadReceipt(true)}
                loading={refreshing}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh Status</span>
              </Button>
              <Button size="sm" onClick={handleVerifyNow} loading={refreshing}>
                Verify via Backend Requery
              </Button>
            </div>
          )}

          {tx.status === 'FAILED' && collection.slug && (
            <div className="no-print">
              <Link to={`/c/${collection.slug}`}>
                <Button variant="primary" size="sm">
                  Try Payment Again
                </Button>
              </Link>
            </div>
          )}

          {/* Transaction Breakdown */}
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Receipt Code</dt>
              <dd className="font-mono-num font-semibold text-slate-900">{tx.receiptCode}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Collection</dt>
              <dd className="font-medium text-slate-900 text-right">{collection.title}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Contributor</dt>
              <dd className="font-medium text-slate-900 text-right">{tx.contributorName}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-700 text-right">{tx.contributorEmail}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-mono-num text-slate-700 text-right">{tx.contributorPhone}</dd>
            </div>
            {tx.quantity && tx.quantity > 1 && (
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Quantity</dt>
                <dd className="font-mono-num font-medium text-slate-900">{tx.quantity} units</dd>
              </div>
            )}
            {(tx.customFieldAnswers && tx.customFieldAnswers.length > 0
              ? tx.customFieldAnswers.map((ans) => ({
                  key: ans.fieldId,
                  label: ans.label,
                  value: formatCustomAnswerValue(ans.value),
                }))
              : tx.customResponses
              ? Object.entries(tx.customResponses).map(([key, val]) => ({
                  key,
                  label: key,
                  value: formatCustomAnswerValue(val),
                }))
              : []
            ).map((item) => (
              <div key={item.key} className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">{item.label}</dt>
                <dd className="font-medium text-slate-900 text-right">{item.value}</dd>
              </div>
            ))}
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Transaction Ref</dt>
              <dd className="font-mono-num text-xs text-slate-800 text-right">{tx.txnRef}</dd>
            </div>
            {tx.interswitchRef && (
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Interswitch Ref</dt>
                <dd className="font-mono-num text-xs text-slate-800 text-right">
                  {tx.interswitchRef}
                </dd>
              </div>
            )}
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Amount Contributed</dt>
              <dd className="font-mono-num text-slate-900">{formatNaira(tx.baseAmount)}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Processing Fee</dt>
              <dd className="font-mono-num text-slate-600">{formatNaira(tx.feeAmount)}</dd>
            </div>
            <div className="py-3 flex justify-between gap-4 font-semibold">
              <dt className="text-slate-900">Total Paid</dt>
              <dd className="font-mono-num text-base text-slate-900">{formatNaira(tx.totalPaid)}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Payment Date</dt>
              <dd className="text-slate-700 text-right">
                {formatDate(tx.paidAt || tx.createdAt, true)}
              </dd>
            </div>
            {tx.receiptHash && (
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Receipt Hash</dt>
                <dd className="font-mono-num text-xs text-slate-600 break-all text-right max-w-[240px]">
                  {tx.receiptHash}
                </dd>
              </div>
            )}
          </dl>

          {/* QR Code Block */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-4">
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl shrink-0">
              <QRCodeSVG
                value={receiptUrl}
                size={104}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#0F172A"
              />
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-xs font-semibold text-slate-900">
                Cryptographically Verified QR Receipt
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scan to open <span className="font-mono-num">{tx.receiptCode}</span> against the
                WePay backend receipt endpoint.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
};
