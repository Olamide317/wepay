import React, { useEffect, useState } from 'react';
import { Building2, ExternalLink } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { OrganizerAvatar } from '../../components/OrganizerAvatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/FormControls';
import { AlertBanner } from '../../components/ui/StateViews';
import { useToast } from '../../components/ui/Toast';
import { NIGERIAN_BANKS } from '../../constants/banks';
import { useAuth } from '../../context/AuthContext';
import { wepayService } from '../../services/wepayService';

export const ProfilePage: React.FC = () => {
  const { organizer, setOrganizerState } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const historyReturnTo =
    location.state && typeof location.state === 'object'
      ? (location.state as Record<string, unknown>).returnTo
      : undefined;
  const returnToCreate =
    new URLSearchParams(location.search).get('returnTo') === '/dashboard/create' ||
    historyReturnTo === '/dashboard/create';

  const [bankCode, setBankCode] = useState(organizer?.settlementBank?.bankCode || '');
  const [accountNumber, setAccountNumber] = useState(
    organizer?.settlementBank?.accountNumber || ''
  );
  const [accountName, setAccountName] = useState(organizer?.settlementBank?.accountName || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setBankCode(organizer?.settlementBank?.bankCode || '');
    setAccountNumber(organizer?.settlementBank?.accountNumber || '');
    setAccountName(organizer?.settlementBank?.accountName || '');
    setSaveError(null);
  }, [
    organizer?._id,
    organizer?.settlementBank?.bankCode,
    organizer?.settlementBank?.accountNumber,
    organizer?.settlementBank?.accountName,
  ]);

  if (!organizer) return null;

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    if (!bankCode) {
      setSaveError('Please select a settlement bank.');
      return;
    }
    if (!/^\d{10}$/.test(accountNumber.trim())) {
      setSaveError('Enter a valid 10-digit NUBAN bank account number.');
      return;
    }
    if (
      accountName.trim().length < 3 ||
      !/^[\p{L} ]+$/u.test(accountName.trim())
    ) {
      setSaveError('Enter an account holder name using letters only.');
      return;
    }

    const selectedBank = NIGERIAN_BANKS.find((b) => b.code === bankCode);
    setSaving(true);
    try {
      const res = await wepayService.updateSettlementBank({
        bankCode,
        bankName: selectedBank?.name || 'Nigerian Bank',
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim().toUpperCase(),
      });
      setOrganizerState(res.organizer);
      setSaveSuccess(true);
      if (returnToCreate) {
        showToast('Bank details saved. Your collection draft is ready to continue.', 'success');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save bank details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Account &amp; Profile</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Manage your organizer identity, public collection hub, and Naira settlement bank.
        </p>
      </div>

      <div className="grid md:grid-cols-12 gap-6 items-start">
        <Card className="md:col-span-5 space-y-5">
          <div className="flex items-center gap-4">
            <OrganizerAvatar
              name={organizer.fullName}
              avatarUrl={organizer.avatarUrl}
              size="xl"
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <h2 className="text-base font-semibold text-slate-900 truncate">
                {organizer.fullName}
              </h2>
              <p className="text-xs text-slate-500 font-mono-num truncate">
                @{organizer.handle}
              </p>
            </div>
          </div>

          <dl className="space-y-2.5 pt-3 border-t border-slate-100 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Full Name</dt>
              <dd className="font-medium text-slate-900 truncate">{organizer.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{organizer.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Phone</dt>
              <dd className="font-mono-num text-slate-900">{organizer.phone || '—'}</dd>
            </div>
          </dl>

          <Link to={`/u/${organizer.handle}`} className="block pt-1">
            <Button variant="outline" fullWidth size="sm">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>View Public Hub (/u/{organizer.handle})</span>
            </Button>
          </Link>
        </Card>

        <Card className="md:col-span-7 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Bank Account Details</h2>
              <p className="text-xs text-slate-500">
                {organizer.settlementBank
                  ? `Active payout account: ${organizer.settlementBank.bankName} · ${organizer.settlementBank.accountNumber}`
                  : 'No settlement bank configured yet. Add your payout destination below.'}
              </p>
            </div>
          </div>

          {saveError && <AlertBanner variant="error" message={saveError} />}
          {saveSuccess && (
            <AlertBanner
              variant="success"
              message="Settlement bank account updated successfully."
              action={
                returnToCreate ? (
                  <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/create')}>
                    Back to Create Collection
                  </Button>
                ) : undefined
              }
            />
          )}

          <form onSubmit={handleSaveBank} className="space-y-4">
            <Select
              label="Bank Name"
              required
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
            >
              <option value="">Select a Nigerian bank...</option>
              {NIGERIAN_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </Select>

            <Input
              label="Account Number"
              maxLength={10}
              inputMode="numeric"
              placeholder="Enter 10-digit account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              required
            />

            <Input
              label="Account Name"
              placeholder="Enter account holder name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value.replace(/[^\p{L} ]/gu, ''))}
              required
            />

            <Button type="submit" loading={saving}>
              {saving ? 'Saving...' : 'Save Bank Details'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
