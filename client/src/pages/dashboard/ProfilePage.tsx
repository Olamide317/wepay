import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Camera,
  Download,
  ExternalLink,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { OrganizerAvatar } from '../../components/OrganizerAvatar';
import { ProfilePictureModal } from '../../components/ProfilePictureModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/FormControls';
import { AlertBanner } from '../../components/ui/StateViews';
import { useAuth } from '../../context/AuthContext';
import { validateAvatarFile } from '../../services/avatarStorage';
import { NIGERIAN_BANKS } from '../../services/mockData';
import { resetSandboxData, wepayService } from '../../services/wepayService';

export const ProfilePage: React.FC = () => {
  const { organizer, isMockMode, setOrganizerState, refreshOrganizer } = useAuth();

  const [bankCode, setBankCode] = useState(organizer?.settlementBank?.bankCode || '');
  const [accountNumber, setAccountNumber] = useState(
    organizer?.settlementBank?.accountNumber || ''
  );
  const [accountName, setAccountName] = useState(organizer?.settlementBank?.accountName || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Profile picture upload & crop state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  useEffect(() => {
    setBankCode(organizer?.settlementBank?.bankCode || '');
    setAccountNumber(organizer?.settlementBank?.accountNumber || '');
    setAccountName(organizer?.settlementBank?.accountName || '');
    setSaveError(null);
    setSaveSuccess(false);
  }, [
    organizer?._id,
    organizer?.settlementBank?.bankCode,
    organizer?.settlementBank?.accountNumber,
    organizer?.settlementBank?.accountName,
  ]);

  if (!organizer) return null;

  const handleTriggerFilePicker = () => {
    setAvatarError(null);
    setAvatarSuccess(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so choosing the same file again after cancel still triggers onChange
    e.target.value = '';
    if (!file) return;

    setAvatarError(null);
    setAvatarSuccess(null);

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setAvatarError(validation.error || 'Invalid image file.');
      return;
    }

    setPendingFile(file);
  };

  const handleConfirmAvatarUpload = async (croppedBlob: Blob, fileName: string) => {
    const res = await wepayService.updateProfilePicture(croppedBlob, fileName);
    setOrganizerState(res.organizer);
    setPendingFile(null);
    setAvatarError(null);
    setAvatarSuccess(
      res.isMock
        ? 'Profile picture saved locally in browser storage (IndexedDB).'
        : 'Profile picture updated successfully.'
    );
  };

  const handleRemoveAvatar = async () => {
    if (!organizer.avatarUrl || removingAvatar) return;
    setAvatarError(null);
    setAvatarSuccess(null);
    setRemovingAvatar(true);
    try {
      const res = await wepayService.removeProfilePicture();
      setOrganizerState(res.organizer);
      setAvatarSuccess('Profile picture removed.');
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : 'Unable to remove profile picture.'
      );
    } finally {
      setRemovingAvatar(false);
    }
  };

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
    if (!accountName.trim() || accountName.trim().length < 3) {
      setSaveError('Enter the account holder name.');
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
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save bank details.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemo = async () => {
    resetSandboxData();
    await refreshOrganizer();
    setAvatarError(null);
    setAvatarSuccess(null);
    setResetMessage('Prototype sandbox data has been restored to initial defaults.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Account &amp; Profile</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Manage your organizer identity, profile picture, public collection hub, and Naira
          settlement bank.
        </p>
      </div>

      <div className="grid md:grid-cols-12 gap-6 items-start">
        <Card className="md:col-span-5 space-y-5">
          {/* Profile Picture Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <OrganizerAvatar
                name={organizer.fullName}
                avatarUrl={organizer.avatarUrl}
                size="xl"
              />
              <div className="min-w-0 space-y-0.5">
                <h2 className="text-base font-semibold text-slate-900 truncate">
                  {organizer.fullName}
                </h2>
                <p className="text-xs text-slate-500 font-mono-num truncate">
                  @{organizer.handle}
                </p>
                <p className="text-xs text-slate-500 pt-0.5">
                  {organizer.avatarUrl
                    ? organizer.avatarStorage === 'local_indexeddb'
                      ? 'Profile picture saved locally'
                      : 'Profile picture set'
                    : 'No profile picture uploaded'}
                </p>
              </div>
            </div>

            {avatarError && <AlertBanner variant="error" message={avatarError} />}
            {avatarSuccess && <AlertBanner variant="success" message={avatarSuccess} />}

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileSelected}
              aria-label="Choose profile picture file"
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTriggerFilePicker}
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Update Profile Picture</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={!organizer.avatarUrl || removingAvatar}
                loading={removingAvatar}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 disabled:text-slate-400 disabled:hover:bg-transparent"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Picture</span>
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">
              Accepted formats: JPG, JPEG, PNG, WEBP · Max size 5 MB
            </p>
          </div>

          <dl className="space-y-2.5 pt-3 border-t border-slate-100 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{organizer.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Phone</dt>
              <dd className="font-mono-num text-slate-900">{organizer.phone}</dd>
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
              <h2 className="text-base font-semibold text-slate-900">Settlement Bank Account</h2>
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
              label="Account Number (NUBAN)"
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
              onChange={(e) => setAccountName(e.target.value)}
              required
            />

            <Button type="submit" loading={saving}>
              {saving ? 'Saving...' : 'Save Settlement Bank'}
            </Button>
          </form>
        </Card>
      </div>

      {/* Export / Sandbox Controls */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Project Source Archive &amp; Sandbox Tools
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Download the complete standalone Vite React project (excluding node_modules) or reset
              local sandbox demo data.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a href="/WePay-Frontend.zip" download="WePay-Frontend.zip">
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5" />
                <span>Download WePay-Frontend.zip</span>
              </Button>
            </a>
            {isMockMode && (
              <Button variant="ghost" size="sm" onClick={handleResetDemo}>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Demo Data</span>
              </Button>
            )}
          </div>
        </div>
        {resetMessage && (
          <div className="mt-3">
            <AlertBanner variant="success" message={resetMessage} />
          </div>
        )}
      </Card>

      <ProfilePictureModal
        open={Boolean(pendingFile)}
        file={pendingFile}
        isMockMode={isMockMode}
        onClose={() => setPendingFile(null)}
        onConfirm={handleConfirmAvatarUpload}
      />
    </div>
  );
};
