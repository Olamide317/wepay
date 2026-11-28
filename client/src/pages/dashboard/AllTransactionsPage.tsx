import React, { useEffect, useMemo, useState } from 'react';
import { Download, ListOrdered, RefreshCw, Search } from 'lucide-react';
import { TransactionTable } from '../../components/TransactionTable';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AlertBanner, EmptyState, LoadingRows } from '../../components/ui/StateViews';
import { wepayService } from '../../services/wepayService';
import { Transaction, TransactionStatus } from '../../types/wepay';
import { exportTransactionsToCsv } from '../../utils/formatters';

export const AllTransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await wepayService.getAllTransactions();
      setTransactions(res.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load transactions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(false);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
      const matchesSearch =
        !q ||
        tx.contributorName.toLowerCase().includes(q) ||
        tx.contributorEmail.toLowerCase().includes(q) ||
        tx.txnRef.toLowerCase().includes(q) ||
        (tx.collectionTitle || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [transactions, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">All Transactions</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Combined payment records across all your WePay collections.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} loading={refreshing}>
            {!refreshing && <RefreshCw className="h-3.5 w-3.5" />}
            <span>Refresh</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={filtered.length === 0}
            onClick={() => exportTransactionsToCsv(filtered, 'wepay-all-transactions')}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

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
            placeholder="Search contributor, collection, or ref..."
            aria-label="Search all transactions"
            className="w-full h-10 pl-9 pr-3.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
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
          title="No transactions found"
          description="No transactions match your current filter criteria."
        />
      ) : (
        <TransactionTable transactions={filtered} showCollectionColumn showQuantityColumn />
      )}
    </div>
  );
};
