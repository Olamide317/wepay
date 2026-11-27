import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, ListOrdered, RefreshCw, Search } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { TransactionTable } from '../../components/TransactionTable';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AlertBanner, EmptyState, LoadingRows } from '../../components/ui/StateViews';
import { wepayService } from '../../services/wepayService';
import { Collection, Transaction, TransactionStatus } from '../../types/wepay';
import { exportTransactionsToCsv, formatNaira } from '../../utils/formatters';

export const CollectionLedgerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');

  const fetchLedger = async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await wepayService.getCollectionLedger(id);
      setCollection(res.collection);
      setTransactions(res.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load transaction ledger.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLedger(false);
  }, [id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
      const matchesSearch =
        !q ||
        tx.contributorName.toLowerCase().includes(q) ||
        tx.contributorEmail.toLowerCase().includes(q) ||
        tx.contributorPhone.toLowerCase().includes(q) ||
        tx.txnRef.toLowerCase().includes(q) ||
        tx.receiptCode.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [transactions, search, statusFilter]);

  const verifiedTotal = transactions
    .filter((t) => t.status === 'SUCCESS')
    .reduce((sum, t) => sum + t.baseAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to={collection ? `/dashboard/collections/${collection._id}` : '/dashboard/collections'}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Collection</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {collection ? `${collection.title} — Ledger` : 'Transaction Ledger'}
          </h1>
          {collection && (
            <p className="text-xs text-slate-500 font-mono-num">
              Verified net collected: {formatNaira(verifiedTotal)} · {transactions.length}{' '}
              transaction(s)
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLedger(true)}
            loading={refreshing}
          >
            {!refreshing && <RefreshCw className="h-3.5 w-3.5" />}
            <span>Refresh</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={filtered.length === 0}
            onClick={() =>
              exportTransactionsToCsv(filtered, collection?.slug || 'wepay-ledger')
            }
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {(['ALL', 'SUCCESS', 'PENDING', 'FAILED'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'ALL'
                ? 'All Statuses'
                : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, or ref..."
            aria-label="Search ledger"
            className="w-full h-10 pl-9 pr-3.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
          />
        </div>
      </div>

      {error && <AlertBanner variant="error" message={error} />}

      {loading ? (
        <Card>
          <LoadingRows rows={5} />
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ListOrdered className="h-6 w-6" />}
          title={
            transactions.length === 0
              ? 'No transactions recorded yet'
              : 'No matching transactions'
          }
          description={
            transactions.length === 0
              ? 'Once contributors initiate payments on the public link, every transaction will appear here.'
              : 'Try clearing your search input or changing the status filter.'
          }
        />
      ) : (
        <TransactionTable
          transactions={filtered}
          showQuantityColumn={collection?.type === 'INVENTORY'}
        />
      )}
    </div>
  );
};
