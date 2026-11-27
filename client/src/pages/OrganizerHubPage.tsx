import React, { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { OrganizerAvatar } from '../components/OrganizerAvatar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { AlertBanner, LoadingRows } from '../components/ui/StateViews';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PublicLayout } from '../layouts/PublicLayout';
import { wepayService } from '../services/wepayService';
import { Collection, Organizer } from '../types/wepay';
import { formatNaira, getShortModeLabel } from '../utils/formatters';

export const OrganizerHubPage: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!handle) return;
      setLoading(true);
      setError(null);
      try {
        const res = await wepayService.getOrganizerPublicHub(handle);
        if (!active) return;
        setOrganizer(res.organizer);
        setCollections(res.collections);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Organizer not found.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [handle]);

  if (loading) {
    return (
      <PublicLayout>
        <Card>
          <LoadingRows rows={4} />
        </Card>
      </PublicLayout>
    );
  }

  if (error || !organizer) {
    return (
      <PublicLayout maxWidth="md">
        <AlertBanner variant="error" message={error || 'Organizer hub not found.'} />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="space-y-6">
        <Card padding="lg">
          <div className="flex items-center gap-4">
            <OrganizerAvatar
              name={organizer.fullName}
              avatarUrl={organizer.avatarUrl}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold text-slate-900">
                  {organizer.fullName}
                </h1>
                {organizer.verified && (
                  <ShieldCheck className="h-4 w-4 text-emerald-600" aria-label="Verified" />
                )}
              </div>
              <p className="text-xs font-mono-num text-slate-500">@{organizer.handle}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Public Collections</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {collections.map((col) => {
              const pct =
                col.type === 'POOL' && col.targetAmount
                  ? Math.min(100, Math.round((col.amountRaised / col.targetAmount) * 100))
                  : null;
              return (
                <Card key={col._id} className="flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 font-medium">
                        {getShortModeLabel(col.type)}
                      </span>
                      <StatusBadge status={col.status} />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">{col.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{col.description}</p>
                    {pct !== null && col.targetAmount && (
                      <div className="pt-2 space-y-1.5">
                        <ProgressBar value={pct} height="sm" />
                        <div className="flex justify-between text-xs font-mono-num text-slate-500">
                          <span>{formatNaira(col.amountRaised, false)} raised</span>
                          <span>{pct}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Link to={`/c/${col.slug}`}>
                    <Button fullWidth size="sm" variant="outline">
                      <span>Open Collection</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};
