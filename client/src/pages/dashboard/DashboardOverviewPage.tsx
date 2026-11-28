import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ExternalLink,
  FolderPlus,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Plus,
  Share2,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmActionModal } from '../../components/ConfirmActionModal';
import { ShareCollectionModal } from '../../components/ShareCollectionModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { AlertBanner, EmptyState, LoadingRows } from '../../components/ui/StateViews';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { wepayService } from '../../services/wepayService';
import { Collection, CollectionStatus, Transaction } from '../../types/wepay';
import { formatDate, formatNaira, getShortModeLabel } from '../../utils/formatters';

export const DashboardOverviewPage: React.FC = () => {
  const navigate = useNavigate();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [shareTarget, setShareTarget] = useState<Collection | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    collection: Collection;
    nextStatus: CollectionStatus;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'primary';
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [colRes, txRes] = await Promise.all([
        wepayService.getCollections(),
        wepayService.getAllTransactions(),
      ]);
      setCollections(colRes.collections);
      setTransactions(txRes.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalCollected = collections.reduce((sum, c) => sum + c.amountRaised, 0);
  const activeCount = collections.filter((c) => c.status === 'ACTIVE').length;
  const successTxCount = transactions.filter((t) => t.status === 'SUCCESS').length;
  const pendingTxCount = transactions.filter((t) => t.status === 'PENDING').length;

  const handleConfirmStatusChange = async () => {
    if (!confirmState) return;
    setActionLoading(true);
    try {
      const { collection: updated } = await wepayService.updateCollectionStatus(
        confirmState.collection._id,
        confirmState.nextStatus
      );
      setCollections((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      setConfirmState(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update collection status.');
    } finally {
      setActionLoading(false);
    }
  };

  const openStatusConfirm = (col: Collection, nextStatus: CollectionStatus) => {
    setOpenMenuId(null);
    if (nextStatus === 'PAUSED') {
      setConfirmState({
        collection: col,
        nextStatus,
        title: 'Pause collection?',
        message: `Contributors opening "${col.title}" will see that payments are temporarily paused until you resume it.`,
        confirmLabel: 'Pause Collection',
        variant: 'danger',
      });
    } else if (nextStatus === 'ACTIVE') {
      setConfirmState({
        collection: col,
        nextStatus,
        title: 'Resume collection?',
        message: `Contributors will be able to submit payments to "${col.title}" again.`,
        confirmLabel: 'Resume Collection',
        variant: 'primary',
      });
    } else if (nextStatus === 'CLOSED') {
      setConfirmState({
        collection: col,
        nextStatus,
        title: 'Close collection permanently?',
        message: `Closing "${col.title}" stops all future payments while preserving its transaction ledger and issued receipts.`,
        confirmLabel: 'Close Collection',
        variant: 'danger',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Workspace</p>
          <h1 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-slate-950">Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">
            Monitor collection totals, active links, and incoming contributor payments.
          </p>
        </div>
        <div className="flex items-center gap-2.5 sm:hidden">
          <Link to="/dashboard/create" className="w-full">
            <Button fullWidth>
              <Plus className="h-4 w-4" />
              <span>Create Collection</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <AlertBanner
          variant="error"
          message={error}
          action={
            <Button size="sm" variant="outline" onClick={loadData}>
              Retry
            </Button>
          }
        />
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card padding="md" className="relative overflow-hidden">
          <div className="absolute left-0 top-5 h-8 w-1 rounded-r-full bg-indigo-500" aria-hidden="true" />
          <p className="text-xs font-medium text-slate-500">
            Total Amount Collected
          </p>
          <p className="text-2xl font-bold font-mono-num text-slate-900 mt-2">
            {loading ? '—' : formatNaira(totalCollected)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">Across all NGN collections</p>
        </Card>

        <Card padding="md">
          <p className="text-xs font-medium text-slate-500">Active Collections</p>
          <p className="text-2xl font-bold font-mono-num text-slate-900 mt-2">
            {loading ? '—' : activeCount}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            {collections.length} total created
          </p>
        </Card>

        <Card padding="md">
          <p className="text-xs font-medium text-slate-500">Successful Contributions</p>
          <p className="text-2xl font-bold font-mono-num text-emerald-700 mt-2">
            {loading ? '—' : successTxCount}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">Verified payments recorded</p>
        </Card>

        <Card padding="md">
          <p className="text-xs font-medium text-slate-500">Pending Transactions</p>
          <p className="text-2xl font-bold font-mono-num text-amber-700 mt-2">
            {loading ? '—' : pendingTxCount}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">Awaiting confirmation</p>
        </Card>
      </div>

      {/* Collections Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">Your Collections</h2>
          <Link
            to="/dashboard/collections"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <Card>
            <LoadingRows rows={4} />
          </Card>
        ) : collections.length === 0 ? (
          <EmptyState
            icon={<FolderPlus className="h-6 w-6" />}
            title="Create your first WePay collection"
            description="Launch a bill split pool, departmental dues link, or limited-stock pre-order page and start accepting Naira payments via Interswitch."
            actionLabel="Create Collection"
            onAction={() => navigate('/dashboard/create')}
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-visible">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Collection</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Amount Raised</th>
                    <th className="py-3 px-4">Target / Stock</th>
                    <th className="py-3 px-4 text-right">Contributors</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {collections.map((col) => {
                    const poolPct =
                      col.type === 'POOL' && col.targetAmount
                        ? Math.min(100, Math.round((col.amountRaised / col.targetAmount) * 100))
                        : null;
                    const stockRemaining =
                      col.type === 'INVENTORY' && col.stockLimit !== undefined
                        ? Math.max(0, col.stockLimit - (col.stockSold ?? 0))
                        : null;

                    return (
                      <tr key={col._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <Link
                            to={`/dashboard/collections/${col._id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors block"
                          >
                            {col.title}
                          </Link>
                          <Link
                            to={`/c/${col.slug}`}
                            className="text-xs text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1 mt-0.5 font-mono-num"
                          >
                            <span>/c/{col.slug}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                          {getShortModeLabel(col.type)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                          {formatNaira(col.amountRaised)}
                        </td>
                        <td className="py-3.5 px-4 min-w-[170px]">
                          {col.type === 'POOL' && col.targetAmount && poolPct !== null && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs text-slate-600 font-mono-num">
                                <span>{poolPct}%</span>
                                <span>{formatNaira(col.targetAmount, false)}</span>
                              </div>
                              <ProgressBar value={poolPct} height="sm" />
                            </div>
                          )}
                          {col.type === 'INVENTORY' && stockRemaining !== null && (
                            <div className="text-xs font-mono-num text-slate-700">
                              <span className="font-semibold">{stockRemaining}</span> /{' '}
                              {col.stockLimit} left
                            </div>
                          )}
                          {col.type === 'OPEN' && (
                            <span className="text-xs text-slate-500 font-mono-num">
                              {formatNaira(col.amount, false)} ({col.pricingRule.toLowerCase()})
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-num text-slate-700">
                          {col.contributorCount ?? 0}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={col.status} />
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(col.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1 relative">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShareTarget(col)}
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">Share</span>
                            </Button>

                            <button
                              type="button"
                              aria-label={`More actions for ${col.title}`}
                              onClick={() =>
                                setOpenMenuId(openMenuId === col._id ? null : col._id)
                              }
                              className="h-9 w-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {openMenuId === col._id && (
                              <div className="absolute right-0 top-10 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 text-left">
                                <Link
                                  to={`/dashboard/collections/${col._id}`}
                                  onClick={() => setOpenMenuId(null)}
                                  className="block px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  View details
                                </Link>
                                <Link
                                  to={`/dashboard/collections/${col._id}/ledger`}
                                  onClick={() => setOpenMenuId(null)}
                                  className="block px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  View ledger
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShareTarget(col);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                  Share collection
                                </button>
                                {col.status === 'ACTIVE' && (
                                  <button
                                    type="button"
                                    onClick={() => openStatusConfirm(col, 'PAUSED')}
                                    className="w-full text-left px-3.5 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <PauseCircle className="h-3.5 w-3.5" />
                                    <span>Pause collection</span>
                                  </button>
                                )}
                                {col.status === 'PAUSED' && (
                                  <button
                                    type="button"
                                    onClick={() => openStatusConfirm(col, 'ACTIVE')}
                                    className="w-full text-left px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <PlayCircle className="h-3.5 w-3.5" />
                                    <span>Resume collection</span>
                                  </button>
                                )}
                                {col.status !== 'CLOSED' &&
                                  col.status !== 'COMPLETED' &&
                                  col.status !== 'SOLD_OUT' && (
                                    <button
                                      type="button"
                                      onClick={() => openStatusConfirm(col, 'CLOSED')}
                                      className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      <span>Close collection</span>
                                    </button>
                                  )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ShareCollectionModal collection={shareTarget} onClose={() => setShareTarget(null)} />

      <ConfirmActionModal
        open={Boolean(confirmState)}
        onClose={() => setConfirmState(null)}
        onConfirm={handleConfirmStatusChange}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel || 'Confirm'}
        variant={confirmState?.variant || 'danger'}
        loading={actionLoading}
      />
    </div>
  );
};
