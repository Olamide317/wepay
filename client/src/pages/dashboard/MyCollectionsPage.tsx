import React, { useEffect, useMemo, useState } from 'react';
import { FolderPlus, Plus, Search, Settings2, Share2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ShareCollectionModal } from '../../components/ShareCollectionModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { AlertBanner, EmptyState, LoadingRows } from '../../components/ui/StateViews';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { wepayService } from '../../services/wepayService';
import { Collection, CollectionType } from '../../types/wepay';
import { formatDate, formatNaira, getCollectionModeLabel } from '../../utils/formatters';

export const MyCollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | CollectionType>('ALL');
  const [shareTarget, setShareTarget] = useState<Collection | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await wepayService.getCollections();
      setCollections(res.collections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load collections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return collections.filter((c) => {
      const matchesMode = modeFilter === 'ALL' || c.type === modeFilter;
      const q = search.trim().toLowerCase();
      const matchesQuery =
        !q || c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
      return matchesMode && matchesQuery;
    });
  }, [collections, modeFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Library</p>
          <h1 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-slate-950">My Collections</h1>
          <p className="text-sm text-slate-600 mt-1">
            SPLIT, FLEXIBLE and INVENTORY collection links. Open any card to manage or preview it.
          </p>
        </div>
        <Link to="/dashboard/create">
          <Button>
            <Plus className="h-4 w-4" />
            <span>Create Collection</span>
          </Button>
        </Link>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {(
            [
              { id: 'ALL', label: 'All Modes' },
              { id: 'POOL', label: 'SPLIT' },
              { id: 'OPEN', label: 'FLEXIBLE' },
              { id: 'INVENTORY', label: 'INVENTORY' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setModeFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                modeFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search collections..."
            aria-label="Search collections"
            className="w-full h-10 pl-9 pr-3.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
          />
        </div>
      </div>

      {error && <AlertBanner variant="error" message={error} />}

      {loading ? (
        <Card>
          <LoadingRows rows={4} />
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderPlus className="h-6 w-6" />}
          title={collections.length === 0 ? 'No collections yet' : 'No matching collections'}
          description={
            collections.length === 0
              ? 'Create your first collection link to begin receiving Naira contributions.'
              : 'Try adjusting your search query or mode filter.'
          }
          actionLabel="Create Collection"
          onAction={() => navigate('/dashboard/create')}
        />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((col) => {
            const pct =
              col.type === 'POOL' && col.targetAmount
                ? Math.min(100, Math.round((col.amountRaised / col.targetAmount) * 100))
                : null;
            const remainingStock =
              col.type === 'INVENTORY' && col.stockLimit !== undefined
                ? Math.max(0, col.stockLimit - (col.stockSold ?? 0))
                : null;

            return (
              <div
                key={col._id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/c/${col.slug}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/c/${col.slug}`);
                  }
                }}
                className="group text-left rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-900/15 flex flex-col justify-between space-y-5 cursor-pointer transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-600/15 focus:outline-none focus:ring-4 focus:ring-teal-600/10"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      {getCollectionModeLabel(col.type)}
                    </span>
                    <StatusBadge status={col.status} />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {col.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{col.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-500">Amount raised</span>
                      <span className="text-lg font-bold font-mono-num text-slate-900">
                        {formatNaira(col.amountRaised)}
                      </span>
                    </div>

                    {col.type === 'POOL' && col.targetAmount && pct !== null && (
                      <div className="space-y-1.5">
                        <ProgressBar value={pct} height="sm" />
                        <div className="flex items-center justify-between text-xs text-slate-500 font-mono-num">
                          <span>{pct}% of {formatNaira(col.targetAmount, false)}</span>
                          <span>{col.contributorCount ?? 0} paid</span>
                        </div>
                      </div>
                    )}

                    {col.type === 'INVENTORY' && remainingStock !== null && (
                      <div className="flex items-center justify-between text-xs text-slate-600 font-mono-num">
                        <span>Unit price: {formatNaira(col.amount, false)}</span>
                        <span>
                          {remainingStock} / {col.stockLimit} left
                        </span>
                      </div>
                    )}

                    {col.type === 'OPEN' && (
                      <div className="flex items-center justify-between text-xs text-slate-600 font-mono-num">
                        <span>
                          {col.pricingRule === 'FIXED' ? 'Fixed' : 'Min'}:{' '}
                          {formatNaira(col.amount, false)}
                        </span>
                        <span>{col.contributorCount ?? 0} contributors</span>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs text-slate-400">{formatDate(col.createdAt)}</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShareTarget(col)}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Share</span>
                    </Button>
                    <Link to={`/dashboard/collections/${col._id}/ledger`}>
                      <Button size="sm" variant="secondary">
                        <span>Ledger</span>
                      </Button>
                    </Link>
                    <Link
                      to={`/dashboard/collections/${col._id}`}
                      aria-label={`Manage ${col.title}`}
                      title="Manage collection settings"
                      className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ShareCollectionModal collection={shareTarget} onClose={() => setShareTarget(null)} />
    </div>
  );
};
