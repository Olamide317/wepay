import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  Package,
  Share2,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ContributorFieldsBuilder } from '../../components/FormBuilder/ContributorFieldsBuilder';
import { ShareCollectionModal } from '../../components/ShareCollectionModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/FormControls';
import { AlertBanner } from '../../components/ui/StateViews';
import { useAuth } from '../../context/AuthContext';
import { wepayService } from '../../services/wepayService';
import { Collection, CollectionType, CustomField, PricingRule } from '../../types/wepay';
import { formatNaira, getCollectionModeLabel } from '../../utils/formatters';

interface FormErrors {
  title?: string;
  description?: string;
  amount?: string;
  targetAmount?: string;
  stockLimit?: string;
}

const AI_PRESET_PROMPTS = [
  '100 NACOS dinner tickets at ₦5,000 with Matric Number',
  '₦10 live pitch demo pass (2 slots)',
];

export const CreateCollectionPage: React.FC = () => {
  const { organizer } = useAuth();
  const settlementBank = organizer?.settlementBank;
  const hasSettlementBank = Boolean(
    settlementBank?.bankCode &&
      settlementBank?.bankName &&
      settlementBank?.accountNumber &&
      settlementBank?.accountName
  );

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [aiAuditTips, setAiAuditTips] = useState<string[]>([]);

  const [type, setType] = useState<CollectionType>('POOL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pricingRule, setPricingRule] = useState<PricingRule>('FIXED');
  const [amount, setAmount] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [stockLimit, setStockLimit] = useState('');
  const [maxQuantityPerOrder, setMaxQuantityPerOrder] = useState('5');
  const [expiresAt, setExpiresAt] = useState('');
  const [passFeeToPayer, setPassFeeToPayer] = useState(true);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createdCollection, setCreatedCollection] = useState<Collection | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const handleGenerateWithAi = async (promptOverride?: string) => {
    const query = (promptOverride ?? aiPrompt).trim();
    if (!query) return;
    if (promptOverride) setAiPrompt(promptOverride);

    setAiGenerating(true);
    setAiNotice(null);
    setSubmitError(null);
    try {
      const { draft, source } = await wepayService.draftCollectionWithAi(query);
      if (draft.type) setType(draft.type);
      if (draft.title) setTitle(draft.title);
      if (draft.description) setDescription(draft.description);
      if (draft.pricingRule) setPricingRule(draft.pricingRule);
      if (draft.amount !== undefined) setAmount(draft.amount > 0 ? String(draft.amount) : '');
      setTargetAmount(draft.targetAmount ? String(draft.targetAmount) : '');
      setStockLimit(draft.stockLimit ? String(draft.stockLimit) : '');
      if (draft.passFeeToPayer !== undefined) setPassFeeToPayer(Boolean(draft.passFeeToPayer));
      setCustomFields(Array.isArray(draft.customFields) ? draft.customFields : []);
      setAiAuditTips(Array.isArray(draft.auditTips) ? draft.auditTips : []);
      setErrors({});
      setAiNotice(
        `Configured via ${source === 'gemini' ? 'Gemini AI' : 'WePay smart fallback'} — review the auto-filled fields below or publish immediately.`
      );
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to generate AI collection draft.'
      );
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSelectType = (nextType: CollectionType) => {
    setType(nextType);
    setErrors({});
    if (nextType === 'INVENTORY') {
      setPricingRule('FIXED');
    }
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!title.trim() || title.trim().length < 3) {
      next.title = 'Collection title must be at least 3 characters.';
    }
    if (!description.trim() || description.trim().length < 10) {
      next.description = 'Provide a short description (at least 10 characters) for contributors.';
    }

    const numAmount = Number(amount);
    if (pricingRule !== 'FLEXIBLE') {
      if (!amount || Number.isNaN(numAmount) || numAmount < 10) {
        next.amount = 'Enter a valid Naira amount (minimum ₦10).';
      }
    }

    if (type === 'POOL') {
      const numTarget = Number(targetAmount);
      if (!targetAmount || Number.isNaN(numTarget) || numTarget < 10) {
        next.targetAmount = 'Target amount must be at least ₦10.';
      } else if (pricingRule === 'FIXED' && numAmount > numTarget) {
        next.amount = 'Contribution amount cannot exceed the pool target.';
      }
    }

    if (type === 'INVENTORY') {
      const numStock = Number(stockLimit);
      if (!stockLimit || !Number.isInteger(numStock) || numStock < 1) {
        next.stockLimit = 'Stock limit must be a whole number of at least 1 unit.';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!hasSettlementBank) {
      setSubmitError(
        'Bank details are required before you can create a collection. Add your settlement bank account first.'
      );
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const orderedFields = customFields.map((f, idx) => ({ ...f, order: idx }));
      const { collection } = await wepayService.createCollection({
        type,
        title,
        description,
        pricingRule: type === 'INVENTORY' ? 'FIXED' : pricingRule,
        amount: pricingRule === 'FLEXIBLE' && type !== 'INVENTORY' ? 0 : Number(amount),
        targetAmount: type === 'POOL' ? Number(targetAmount) : undefined,
        stockLimit: type === 'INVENTORY' ? Number(stockLimit) : undefined,
        maxQuantityPerOrder:
          type === 'INVENTORY' ? Math.max(1, Number(maxQuantityPerOrder) || 5) : undefined,
        passFeeToPayer,
        customFields: orderedFields,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      setCreatedCollection(collection);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to create collection. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (createdCollection) {
    const publicUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/c/${createdCollection.slug}`
        : `/c/${createdCollection.slug}`;

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    };

    return (
      <div className="max-w-2xl mx-auto py-4 space-y-6">
        <Card padding="lg">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Collection Created Successfully
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                <span className="font-semibold text-slate-900">{createdCollection.title}</span> is
                now active and ready to receive payments.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2">
              <p className="text-xs font-medium text-slate-500">
                Public Collection URL (assigned by backend)
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  aria-label="Created collection URL"
                  className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-mono-num text-slate-900"
                />
                <Button onClick={handleCopy} variant={copied ? 'secondary' : 'primary'}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => setShareOpen(true)} fullWidth>
                <Share2 className="h-4 w-4" />
                <span>Share &amp; QR Code</span>
              </Button>
              <Link to={`/c/${createdCollection.slug}`} className="w-full">
                <Button variant="outline" fullWidth>
                  <ExternalLink className="h-4 w-4" />
                  <span>Preview Public Page</span>
                </Button>
              </Link>
              <Link to={`/dashboard/collections/${createdCollection._id}`} className="w-full">
                <Button fullWidth>
                  <span>View Collection</span>
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <ShareCollectionModal
          collection={shareOpen ? createdCollection : null}
          onClose={() => setShareOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Create Collection</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Describe your collection in plain English with AI or configure every rule manually.
        </p>
      </div>

      {!hasSettlementBank && (
        <AlertBanner
          variant="warning"
          title="Settlement bank details required"
          message="Add a valid settlement bank account before you can publish a collection or pool."
          action={
            <Link to="/dashboard/profile">
              <Button variant="outline" size="sm">
                Add Bank Details
              </Button>
            </Link>
          }
        />
      )}

      {/* AI Smart Collection Builder */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50">
        <div className="space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Describe with WePay AI
                </h2>
                <p className="text-xs text-slate-600">
                  Describe what you are collecting and let WePay AI auto-configure mode, pricing, stock caps, and custom fields.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerateWithAi();
                }
              }}
              placeholder="e.g. Split ₦75,000 Starlink bill among 5 roommates..."
              className="flex-1 h-10 px-3.5 rounded-lg border border-indigo-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            />
            <Button
              type="button"
              onClick={() => handleGenerateWithAi()}
              loading={aiGenerating}
              disabled={!aiPrompt.trim()}
            >
              {!aiGenerating && <Wand2 className="h-4 w-4" />}
              <span>{aiGenerating ? 'Generating...' : 'Generate Form'}</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 mr-1">Try:</span>
            {AI_PRESET_PROMPTS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleGenerateWithAi(preset)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          {aiNotice && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>{aiNotice}</span>
            </div>
          )}
          {aiAuditTips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {aiAuditTips.map((tip) => (
                <span
                  key={tip}
                  className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800"
                >
                  {tip}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      {submitError && <AlertBanner variant="error" message={submitError} />}

      <form onSubmit={handleSubmit} noValidate className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* Step 1: Select Collection Type */}
          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  1. Select Collection Type
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose the collection rule that matches how funds should be tracked.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {(
                  [
                    {
                      id: 'POOL',
                      title: 'Bill Split / Group Pool',
                      desc: 'Collect towards a target amount that closes automatically once reached.',
                      Icon: Users,
                    },
                    {
                      id: 'OPEN',
                      title: 'Open Collection / Dues',
                      desc: 'Accept ongoing contributions or student dues with no hard target cap.',
                      Icon: Layers,
                    },
                    {
                      id: 'INVENTORY',
                      title: 'Merchant Pre-Order',
                      desc: 'Sell finite stock units with quantity limits and fulfillment questions.',
                      Icon: Package,
                    },
                  ] as const
                ).map(({ id, title: cardTitle, desc, Icon }) => {
                  const selected = type === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectType(id)}
                      aria-pressed={selected}
                      className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                        selected
                          ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                          selected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{cardTitle}</p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Step 2: Collection Information */}
          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  2. Collection Information
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {type === 'INVENTORY'
                    ? 'Shown prominently to customers on the public payment page.'
                    : 'Shown prominently to contributors on the public payment page.'}
                </p>
              </div>

              <Input
                label={type === 'INVENTORY' ? 'Product / Pre-Order Title' : 'Collection Title'}
                required
                placeholder={
                  type === 'POOL'
                    ? 'e.g. November Starlink Subscription'
                    : type === 'INVENTORY'
                    ? 'e.g. Campus Snack Box'
                    : 'e.g. NACOS 400L Departmental Dues'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
              />

              <Textarea
                label="Description"
                required
                rows={3}
                placeholder={
                  type === 'INVENTORY'
                    ? 'Explain what customers are paying for, pickup instructions, or fulfillment timeline...'
                    : 'Explain what contributors are paying for, pickup instructions, or settlement timeline...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={errors.description}
              />
            </div>
          </Card>

          {/* Step 3: Dynamic Pricing Configuration */}
          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  3. Pricing &amp; {type === 'INVENTORY' ? 'Inventory' : 'Target'} Configuration
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  All figures operate in Nigerian Naira (NGN).
                </p>
              </div>

              {type !== 'INVENTORY' && (
                <Select
                  label="Pricing Rule"
                  value={pricingRule}
                  onChange={(e) => setPricingRule(e.target.value as PricingRule)}
                >
                  <option value="FIXED">Fixed contribution amount per payer</option>
                  <option value="MINIMUM">Minimum contribution (payers can give more)</option>
                  <option value="FLEXIBLE">Any amount (flexible contribution)</option>
                </Select>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {(type === 'INVENTORY' || pricingRule !== 'FLEXIBLE') && (
                  <Input
                    label={
                      type === 'INVENTORY'
                        ? 'Unit Price (NGN)'
                        : pricingRule === 'MINIMUM'
                        ? 'Minimum Contribution (NGN)'
                        : 'Contribution Amount (NGN)'
                    }
                    type="number"
                    min={10}
                    required
                    leftAddon="₦"
                    placeholder={type === 'INVENTORY' ? '2500' : '15000'}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    error={errors.amount}
                  />
                )}

                {type === 'POOL' && (
                  <Input
                    label="Pool Target Amount (NGN)"
                    type="number"
                    min={10}
                    required
                    leftAddon="₦"
                    placeholder="75000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    error={errors.targetAmount}
                  />
                )}

                {type === 'INVENTORY' && (
                  <>
                    <Input
                      label="Available Stock Limit"
                      type="number"
                      min={1}
                      required
                      placeholder="30"
                      value={stockLimit}
                      onChange={(e) => setStockLimit(e.target.value)}
                      error={errors.stockLimit}
                    />
                    <Input
                      label="Max Units Per Order"
                      type="number"
                      min={1}
                      max={20}
                      value={maxQuantityPerOrder}
                      onChange={(e) => setMaxQuantityPerOrder(e.target.value)}
                    />
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Step 4: Dynamic Contributor Information Fields Builder */}
          <ContributorFieldsBuilder fields={customFields} onChange={setCustomFields} />

          {/* Step 5: Additional Settings */}
          <Card>
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">5. Additional Settings</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure processing fee handling and optional collection deadline.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Processing Fee Handling
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPassFeeToPayer(true)}
                    className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      passFeeToPayer
                        ? 'border-indigo-600 bg-indigo-50/70'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      Contributor pays processing fee
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      You receive 100% of the configured contribution amount.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPassFeeToPayer(false)}
                    className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      !passFeeToPayer
                        ? 'border-indigo-600 bg-indigo-50/70'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      Organizer absorbs processing fee
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Contributor pays exact headline price with zero added checkout fee.
                    </p>
                  </button>
                </div>
              </div>

              <Input
                label="Optional Expiry / Deadline"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                hint="Leave blank if this collection has no fixed closing date."
              />
            </div>
          </Card>
        </div>

        {/* Step 6: Live Review & Submit Sticky Panel */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          <Card>
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-900">6. Review &amp; Create</h2>
              <dl className="space-y-3 text-sm border-t border-slate-100 pt-3">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Type</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {getCollectionModeLabel(type)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Title</dt>
                  <dd className="font-medium text-slate-900 text-right truncate max-w-[180px]">
                    {title.trim() || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">
                    {type === 'INVENTORY' ? 'Unit Price' : 'Pricing'}
                  </dt>
                  <dd className="font-mono-num font-medium text-slate-900 text-right">
                    {pricingRule === 'FLEXIBLE' && type !== 'INVENTORY'
                      ? 'Flexible amount'
                      : amount
                      ? formatNaira(Number(amount))
                      : '—'}
                  </dd>
                </div>
                {type === 'POOL' && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Target</dt>
                    <dd className="font-mono-num font-semibold text-slate-900">
                      {targetAmount ? formatNaira(Number(targetAmount)) : '—'}
                    </dd>
                  </div>
                )}
                {type === 'INVENTORY' && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Stock Limit</dt>
                    <dd className="font-mono-num font-semibold text-slate-900">
                      {stockLimit ? `${stockLimit} units` : '—'}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Fee Handling</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {passFeeToPayer ? 'Contributor pays' : 'Organizer absorbs'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Custom Fields</dt>
                  <dd className="font-mono-num text-slate-900">{customFields.length}</dd>
                </div>
              </dl>

              {customFields.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <p className="text-xs font-medium text-slate-500">Configured Fields</p>
                  <ul className="text-xs text-slate-700 space-y-1">
                    {customFields.map((cf) => (
                      <li key={cf.id} className="flex justify-between gap-2">
                        <span className="truncate">{cf.label}</span>
                        <span className="text-slate-400 shrink-0">
                          {cf.required ? 'Required' : 'Optional'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={submitting}
                  disabled={!hasSettlementBank}
                >
                  {submitting ? 'Creating Collection...' : 'Create Collection'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
};