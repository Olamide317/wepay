import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Download,
  ExternalLink,
  FolderKanban,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AlertBanner, EmptyState, LoadingRows } from '../../components/ui/StateViews';
import { wepayService } from '../../services/wepayService';
import {
  AdminOverviewData,
  AdminTransaction,
  TransactionStatus,
} from '../../types/wepay';
import { formatDate, formatNaira } from '../../utils/formatters';

const STATUS_FILTERS: Array<'ALL' | TransactionStatus> = [
  'ALL',
  'SUCCESS',
  'PENDING',
  'FAILED',
];

const getCollection = (transaction: AdminTransaction) =>
  typeof transaction.collectionId === 'object' ? transaction.collectionId : null;

const getStatusClass = (status: TransactionStatus) => {
  if (status === 'SUCCESS') return 'bg-emerald-50 text-emerald-700';
  if (status === 'FAILED') return 'bg-red-50 text-red-700';
  return 'bg-amber-50 text-amber-700';
};

export const FounderAdminPage: React.FC = () => {
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');
  const [radarLoading, setRadarLoading] = useState(false);
  const [radar, setRadar] = useState<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    headline: string;
    findings: Array<{ title: string; detail: string; severity: 'INFO' | 'WARN' | 'ALERT' }>;
    recommendations: string[];
  } | null>(null);

  const loadOverview = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setOverview(await wepayService.getAdminOverview());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load platform telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (overview?.recentTransactions || []).filter((transaction) => {
      const collection = getCollection(transaction);
      const matchesStatus = statusFilter === 'ALL' || transaction.status === statusFilter;
      const matchesSearch =
        !query ||
        transaction.txnRef.toLowerCase().includes(query) ||
        (transaction.payerName || transaction.contributorName).toLowerCase().includes(query) ||
        transaction.contributorEmail.toLowerCase().includes(query) ||
        (collection?.title || '').toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [overview, search, statusFilter]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      await wepayService.exportAdminTransactionsCsv();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export transactions.');
    } finally {
      setExporting(false);
    }
  };

  const handleRiskScan = async () => {
    setRadarLoading(true);
    setError(null);
    try {
      const result = await wepayService.getAdminFraudRadar();
      setRadar(result.radar);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Unable to run the fraud radar.');
    } finally {
      setRadarLoading(false);
    }
  };

  const kpis = overview?.kpis;
  const cards = [
    {
      label: 'Gross Processed Volume',
      value: formatNaira(kpis?.totalGrossVolume || 0),
      Icon: Wallet,
      accent: 'text-indigo-700 bg-indigo-50',
    },
    {
      label: 'Platform Fee Revenue',
      value: formatNaira(kpis?.totalFeeRevenue || 0),
      Icon: Activity,
      accent: 'text-emerald-700 bg-emerald-50',
    },
    {
      label: 'Total Organizers',
      value: (kpis?.totalOrganizers || 0).toLocaleString(),
      Icon: Users,
      accent: 'text-sky-700 bg-sky-50',
    },
    {
      label: 'Active Collections',
      value: (kpis?.activeCollections || 0).toLocaleString(),
      Icon: FolderKanban,
      accent: 'text-violet-700 bg-violet-50',
    },
    {
      label: 'Checkout Conversion Rate',
      value: `${(kpis?.conversionRate || 0).toFixed(2)}%`,
      Icon: Activity,
      accent: 'text-amber-700 bg-amber-50',
    },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Platform operations
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-950">
            Founder Command Center
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Read-only platform telemetry and transaction oversight.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadOverview(true)} loading={refreshing}>
            {!refreshing && <RefreshCw className="h-3.5 w-3.5" />}
            <span>Refresh</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void handleExport()} loading={exporting}>
            {!exporting && <Download className="h-3.5 w-3.5" />}
            <span>Export Master CSV</span>
          </Button>
        </div>
      </header>

      <Card padding="lg" className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">AI Anomaly & Fraud Radar</h2>
            </div>
            {radar ? (
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  radar.riskLevel === 'HIGH'
                    ? 'bg-red-100 text-red-800'
                    : radar.riskLevel === 'MEDIUM'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {radar.riskLevel}
                </span>
                <p className="text-sm font-semibold text-slate-800">{radar.headline}</p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Scan failed attempts, email patterns, and platform transaction spikes.</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => void handleRiskScan()} loading={radarLoading}>
            {!radarLoading && <Sparkles className="h-3.5 w-3.5" />}
            <span>Run AI Risk Scan</span>
          </Button>
        </div>
        {radar && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              {radar.findings.map((finding) => (
                <div key={`${finding.title}-${finding.detail}`} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900">{finding.title}</p>
                    <span className="text-[10px] font-semibold text-slate-500">{finding.severity}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{finding.detail}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-bold text-slate-900">Recommendations</p>
              <ul className="mt-2 space-y-1.5">
                {radar.recommendations.map((recommendation) => (
                  <li key={recommendation} className="text-xs text-slate-600">• {recommendation}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>

      {error && <AlertBanner variant="error" message={error} />}

      {loading ? (
        <Card><LoadingRows rows={5} /></Card>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Platform KPIs">
            {cards.map(({ label, value, Icon, accent }) => (
              <Card key={label} padding="md" className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-medium leading-5 text-slate-500">{label}</p>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-4 truncate text-xl font-bold text-slate-950 tabular-nums">{value}</p>
              </Card>
            ))}
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-950">Global Live Transactions</h2>
                <p className="text-xs text-slate-500">Latest 30 platform-wide records</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search ref, payer, collection..."
                    aria-label="Search transactions"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm sm:w-72"
                  />
                </div>
                <select
                  aria-label="Filter transactions by status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'ALL' | TransactionStatus)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                >
                  {STATUS_FILTERS.map((status) => (
                    <option key={status} value={status}>
                      {status === 'ALL' ? 'All statuses' : status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-6 w-6" />}
                title="No transactions found"
                description="No recent transaction matches this search and status filter."
              />
            ) : (
              <Card padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Reference</th>
                        <th className="px-4 py-3 font-semibold">Collection / Organizer</th>
                        <th className="px-4 py-3 font-semibold">Payer</th>
                        <th className="px-4 py-3 text-right font-semibold">Total paid</th>
                        <th className="px-4 py-3 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map((transaction) => {
                        const collection = getCollection(transaction);
                        return (
                          <tr key={transaction._id} className="text-slate-700">
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                              {formatDate(transaction.createdAt, true)}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                              {transaction.txnRef}
                              <span className="mt-1 block font-sans text-slate-500">{transaction.receiptCode}</span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">{collection?.title || 'Deleted collection'}</p>
                              <p className="text-xs text-slate-500">
                                {collection?.organizer?.fullName || collection?.organizer?.name || collection?.organizer?.email || 'Organizer unavailable'}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">
                                {transaction.payerName || transaction.contributorName}
                              </p>
                              <p className="text-xs text-slate-500">{transaction.contributorEmail}</p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">
                              {formatNaira(transaction.totalPaid)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(transaction.status)}`}>
                                {transaction.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-950">All Platform Collections</h2>
              <p className="text-xs text-slate-500">Collections and their organizer totals</p>
            </div>
            {overview?.collections.length ? (
              <Card padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Collection</th>
                        <th className="px-4 py-3 font-semibold">Organizer</th>
                        <th className="px-4 py-3 font-semibold">Type / Status</th>
                        <th className="px-4 py-3 text-right font-semibold">Raised</th>
                        <th className="px-4 py-3 text-right font-semibold">Contributors</th>
                        <th className="px-4 py-3 text-right font-semibold">Public link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overview.collections.map((collection) => (
                        <tr key={collection._id} className="text-slate-700">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{collection.title}</p>
                            <p className="text-xs text-slate-500">{formatDate(collection.createdAt)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">
                              {collection.organizer?.fullName || collection.organizer?.name || 'Organizer'}
                            </p>
                            <p className="text-xs text-slate-500">{collection.organizer?.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{collection.type}</p>
                            <p className="text-xs text-slate-500">{collection.status}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                            {formatNaira(collection.totalCollected)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {(collection.contributorCount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              to={`/c/${encodeURIComponent(collection.slug)}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${collection.title}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                            >
                              View
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <EmptyState
                icon={<FolderKanban className="h-6 w-6" />}
                title="No collections yet"
                description="Platform collections will appear here."
              />
            )}
          </section>
        </>
      )}
    </div>
  );
};
