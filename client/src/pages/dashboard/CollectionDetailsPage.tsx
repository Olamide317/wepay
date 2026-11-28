import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  ListOrdered,
  PauseCircle,
  PlayCircle,
  Share2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmActionModal } from '../../components/ConfirmActionModal';
import { ShareCollectionModal } from '../../components/ShareCollectionModal';
import { TransactionTable } from '../../components/TransactionTable';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { AlertBanner, EmptyState, LoadingRows } from '../../components/ui/StateViews';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { wepayService } from '../../services/wepayService';
import { Collection, CollectionStatus, Transaction } from '../../types/wepay';
import {
  formatDate,
  formatNaira,
  getCollectionModeLabel,
  getCustomFieldTypeLabel,
} from '../../utils/formatters';

export const CollectionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmNextStatus, setConfirmNextStatus] = useState<CollectionStatus | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [reminderGenerating, setReminderGenerating] = useState(false);
  const [broadcastCopied, setBroadcastCopied] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await wepayService.getCollectionLedger(id);
      setCollection(res.collection);
      setTransactions(res.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load collection details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <Card>
        <LoadingRows rows={6} />
      </Card>
    );
  }

  if (error || !collection) {
    return (
      <div className="space-y-4">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
        <AlertBanner variant="error" message={error || 'Collection not found.'} />
      </div>
    );
  }

  const publicUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/c/${collection.slug}`
      : `/c/${collection.slug}`;

  const poolPct =
    collection.type === 'POOL' && collection.targetAmount
      ? Math.min(100, Math.round((collection.amountRaised / collection.targetAmount) * 100))
      : 0;
  const remainingTarget =
    collection.type === 'POOL' && collection.targetAmount
      ? Math.max(0, collection.targetAmount - collection.amountRaised)
      : 0;
  const remainingStock =
    collection.type === 'INVENTORY' && collection.stockLimit !== undefined
      ? Math.max(0, collection.stockLimit - (collection.stockSold ?? 0))
      : 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleStatusChange = async () => {
    if (!confirmNextStatus) return;
    setUpdatingStatus(true);
    try {
      const { collection: updated } = await wepayService.updateCollectionStatus(
        collection._id,
        confirmNextStatus
      );
      setCollection(updated);
      setConfirmNextStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleGenerateAndCopyReminder = async () => {
    setReminderGenerating(true);
    setError(null);
    try {
      const result = await wepayService.getCollectionAiInsights(collection._id);
      const reminder = result.analysis.whatsappBroadcast?.trim();
      if (!reminder) throw new Error('WePay AI did not return a WhatsApp reminder.');
      await navigator.clipboard.writeText(reminder);
      setBroadcastCopied(true);
      window.setTimeout(() => setBroadcastCopied(false), 2000);
    } catch (insightError) {
      setBroadcastCopied(false);
      setError(insightError instanceof Error ? insightError.message : 'Unable to generate and copy a WhatsApp reminder.');
    } finally {
      setReminderGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/dashboard/collections"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>My Collections</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-slate-900">{collection.title}</h1>
            <StatusBadge status={collection.status} />
          </div>
          <p className="text-xs text-slate-500">
            {getCollectionModeLabel(collection.type)} · Created {formatDate(collection.createdAt)}
            {collection.expiresAt && ` · Expires ${formatDate(collection.expiresAt)}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleGenerateAndCopyReminder()}
            loading={reminderGenerating}
          >
            {!reminderGenerating && (broadcastCopied ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />)}
            <span>{broadcastCopied ? 'Reminder Copied' : 'AI WhatsApp Reminder'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
          <Link to={`/dashboard/collections/${collection._id}/ledger`}>
            <Button variant="secondary" size="sm">
              <ListOrdered className="h-4 w-4" />
              <span>Full Ledger</span>
            </Button>
          </Link>
          {collection.status === 'ACTIVE' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmNextStatus('PAUSED')}
            >
              <PauseCircle className="h-4 w-4 text-[#f59e08]" />
              <span>Pause</span>
            </Button>
          )}
          {collection.status === 'PAUSED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmNextStatus('ACTIVE')}
            >
              <PlayCircle className="h-4 w-4 text-teal-600" />
              <span>Resume</span>
            </Button>
          )}
          {collection.status !== 'CLOSED' &&
            collection.status !== 'COMPLETED' &&
            collection.status !== 'SOLD_OUT' && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setConfirmNextStatus('CLOSED')}
              >
                <XCircle className="h-4 w-4" />
                <span>Close</span>
              </Button>
            )}
        </div>
      </div>

      {/* Key Metrics & Link */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Amount Raised</p>
              <p className="text-3xl font-bold font-mono-num text-slate-900 mt-1">
                {formatNaira(collection.amountRaised)}
              </p>
            </div>
            {collection.type === 'POOL' && collection.targetAmount && (
              <div className="text-left sm:text-right">
                <p className="text-xs font-medium text-slate-500">Target / Remaining</p>
                <p className="text-sm font-mono-num text-slate-800 mt-1">
                  {formatNaira(collection.targetAmount)} ·{' '}
                  <span className="font-semibold text-teal-700">
                    {formatNaira(remainingTarget)} left
                  </span>
                </p>
              </div>
            )}
            {collection.type === 'INVENTORY' && collection.stockLimit !== undefined && (
              <div className="text-left sm:text-right">
                <p className="text-xs font-medium text-slate-500">Inventory Availability</p>
                <p className="text-sm font-mono-num text-slate-800 mt-1">
                  <span className="font-semibold text-teal-700">{remainingStock}</span> remaining
                  of {collection.stockLimit} ({collection.stockSold ?? 0} sold)
                </p>
              </div>
            )}
          </div>

          {collection.type === 'POOL' && collection.targetAmount && (
            <div className="space-y-1.5">
              <ProgressBar value={poolPct} />
              <div className="flex justify-between text-xs text-slate-500 font-mono-num">
                <span>{poolPct}% completed</span>
                <span>{collection.contributorCount ?? 0} contributors</span>
              </div>
            </div>
          )}

          {collection.type === 'INVENTORY' && collection.stockLimit && (
            <div className="space-y-1.5">
              <ProgressBar
                value={Math.round(((collection.stockSold ?? 0) / collection.stockLimit) * 100)}
              />
              <div className="flex justify-between text-xs text-slate-500 font-mono-num">
                <span>Unit Price: {formatNaira(collection.amount)}</span>
                <span>{collection.stockSold ?? 0} units ordered</span>
              </div>
            </div>
          )}

          <p className="text-sm text-slate-600 pt-2 border-t border-slate-100 leading-relaxed">
            {collection.description}
          </p>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Public Collection Link</h2>
          <div className="space-y-2">
            <input
              type="text"
              readOnly
              value={publicUrl}
              aria-label="Collection public link"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono-num text-slate-800"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </Button>
              <Link to={`/c/${collection.slug}`}>
                <Button variant="outline" size="sm" fullWidth>
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Page</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Fee handling</span>
              <span className="font-medium text-slate-900">
                {collection.passFeeToPayer ? 'Paid by contributor' : 'Absorbed by organizer'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Custom fields</span>
              <span className="font-mono-num font-medium text-slate-900">
                {collection.customFields.length}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Configured Contributor Information Fields */}
      {collection.customFields.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Contributor Information Fields
              </h2>
              <p className="text-xs text-slate-500">
                Custom questions shown on the public payment form for this collection.
              </p>
            </div>
            <span className="text-xs font-mono-num text-slate-500">
              {collection.customFields.length} field
              {collection.customFields.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...collection.customFields]
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((field, idx) => (
                <div
                  key={field.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      <span className="text-xs font-mono-num text-slate-400 mr-1.5">
                        {idx + 1}.
                      </span>
                      {field.label}
                    </span>
                    <span
                      className={`text-xs font-medium shrink-0 ${
                        field.required ? 'text-teal-700' : 'text-slate-500'
                      }`}
                    >
                      {field.required ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {getCustomFieldTypeLabel(field.type)}
                    {field.placeholder ? ` · "${field.placeholder}"` : ''}
                  </p>
                  {field.helpText && (
                    <p className="text-xs text-slate-500">Help: {field.helpText}</p>
                  )}
                  {field.options && field.options.length > 0 && (
                    <p className="text-xs text-slate-600">
                      Options: {field.options.join(', ')}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Recent Transactions Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Recent Ledger Activity
          </h2>
          <Link
            to={`/dashboard/collections/${collection._id}/ledger`}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            Open Full Ledger ({transactions.length}) →
          </Link>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            icon={<ListOrdered className="h-6 w-6" />}
            title="No contributions yet"
            description="Share this collection link with contributors. Payments will appear here as soon as they are initialized."
            actionLabel="Share Collection Link"
            onAction={() => setShareOpen(true)}
          />
        ) : (
          <TransactionTable
            transactions={transactions.slice(0, 5)}
            showQuantityColumn={collection.type === 'INVENTORY'}
          />
        )}
      </div>

      <ShareCollectionModal
        collection={shareOpen ? collection : null}
        onClose={() => setShareOpen(false)}
      />

      <ConfirmActionModal
        open={Boolean(confirmNextStatus)}
        onClose={() => setConfirmNextStatus(null)}
        onConfirm={handleStatusChange}
        title={
          confirmNextStatus === 'PAUSED'
            ? 'Pause this collection?'
            : confirmNextStatus === 'ACTIVE'
            ? 'Resume this collection?'
            : 'Close this collection?'
        }
        message={
          confirmNextStatus === 'PAUSED'
            ? 'Contributors will temporarily be unable to pay until you resume the collection.'
            : confirmNextStatus === 'ACTIVE'
            ? 'Contributors will be able to pay through the public link again.'
            : 'Closing permanently stops new payments while preserving your ledger and receipts.'
        }
        confirmLabel={
          confirmNextStatus === 'PAUSED'
            ? 'Pause Collection'
            : confirmNextStatus === 'ACTIVE'
            ? 'Resume Collection'
            : 'Close Collection'
        }
        variant={confirmNextStatus === 'ACTIVE' ? 'primary' : 'danger'}
        loading={updatingStatus}
      />
    </div>
  );
};
