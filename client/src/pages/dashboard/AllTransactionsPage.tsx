import React, { useEffect, useMemo, useState } from 'react';
import { Download, ListOrdered, RefreshCw, Search, Sparkles } from 'lucide-react';
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
  const [ledgerQuestion, setLedgerQuestion] = useState('');
  const [ledgerAnswer, setLedgerAnswer] = useState<string | null>(null);
  const [ledgerMetric, setLedgerMetric] = useState<string | null>(null);
  const [ledgerAsking, setLedgerAsking] = useState(false);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);

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

  const askLedger = async (questionOverride?: string) => {
    const question = (questionOverride || ledgerQuestion).trim();
    if (!question) return;
    setLedgerQuestion(question);
    setLedgerAsking(true);
    setLedgerAnswer(null);
    try {
      const result = await wepayService.askOrganizerLedger(question);
      setLedgerAnswer(result.answer);
      setLedgerMetric(result.summaryMetric);
      setMatchedIds(result.matchedTransactionIds);
    } catch (askError) {
      setLedgerAnswer(askError instanceof Error ? askError.message : 'Unable to ask the ledger.');
      setLedgerMetric(null);
      setMatchedIds([]);
    } finally {
      setLedgerAsking(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
      const matchesLedger = matchedIds.length === 0 || matchedIds.includes(String(tx._id));
      const matchesSearch =
        !q ||
        tx.contributorName.toLowerCase().includes(q) ||
        tx.contributorEmail.toLowerCase().includes(q) ||
        tx.txnRef.toLowerCase().includes(q) ||
        (tx.collectionTitle || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch && matchesLedger;
    });
  }, [transactions, search, statusFilter, matchedIds]);

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

      <Card padding="md" className="border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-white">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Ask Your Ledger</h2>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void askLedger();
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input
              value={ledgerQuestion}
              onChange={(event) => setLedgerQuestion(event.target.value)}
              placeholder="e.g. How much have we raised?"
              className="h-10 flex-1 rounded-lg border border-indigo-200 bg-white px-3 text-sm focus:border-indigo-600 focus:outline-none"
            />
            <Button type="submit" loading={ledgerAsking} disabled={!ledgerQuestion.trim()}>
              <Sparkles className="h-4 w-4" />
              <span>Ask Ledger</span>
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {['How much have we raised?', 'Show pending or failed payments', 'Who paid most recently?'].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void askLedger(prompt)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300"
              >
                {prompt}
              </button>
            ))}
          </div>
          {ledgerAnswer && (
            <AlertBanner
              variant="info"
              title={ledgerMetric || 'Ledger answer'}
              message={ledgerAnswer}
              action={
                matchedIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setMatchedIds([])}
                    className="text-xs font-semibold text-indigo-700"
                  >
                    Clear match filter
                  </button>
                ) : undefined
              }
            />
          )}
        </div>
      </Card>

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
          title="No transactions found"
          description="No transactions match your current filter criteria."
        />
      ) : (
        <TransactionTable transactions={filtered} showCollectionColumn showQuantityColumn />
      )}
    </div>
  );
};
