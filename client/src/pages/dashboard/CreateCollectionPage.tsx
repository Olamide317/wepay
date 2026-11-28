import React, { useEffect, useRef, useState } from 'react';
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
import { Link, useSearchParams } from 'react-router-dom';
import { ContributorFieldsBuilder } from '../../components/FormBuilder/ContributorFieldsBuilder';
import { ShareCollectionModal } from '../../components/ShareCollectionModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/FormControls';
import { AlertBanner } from '../../components/ui/StateViews';
import { useToast } from '../../components/ui/Toast';
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
  maxQuantityPerOrder?: string;
}

const AI_PRESET_PROMPTS = [
  'Split ₦75,000 Starlink bill among 5 roommates',
  'Pre-order 30 snack boxes at ₦2,500 asking for Hostel & Room',
  'NACOS 300L departmental dues of ₦3,000 asking for Matric Number',
];

export const CreateCollectionPage: React.FC = () => {
  const { organizer } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get('type');
  const initialType: CollectionType =
    requestedType === 'POOL' || requestedType === 'OPEN' || requestedType === 'INVENTORY'
      ? requestedType
      : 'POOL';
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

  const [type, setType] = useState<CollectionType>(initialType);
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
  const submissionInProgress = useRef(false);

  const [createdCollection, setCreatedCollection] = useState<Collection | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  const handleGenerateWithAi = async (promptOverride?: string) => {
    const query = (promptOverride ?? aiPrompt).trim();
    if (!query) return;
    if (promptOverride) setAiPrompt(promptOverride);

    setAiGenerating(true);
    setAiNotice(null);
    setSubmitError(null);
    try {
      const { draft } = await wepayService.generateAiCollectionDraft(query);
      if (draft.type) setType(draft.type);
      if (draft.title) setTitle(draft.title);
      if (draft.description) setDescription(draft.description);
      if (draft.pricingRule) setPricingRule(draft.pricingRule);
      if (draft.amount !== undefined) setAmount(draft.amount > 0 ? String(draft.amount) : '');
      setTargetAmount(draft.targetAmount ? String(draft.targetAmount) : '');
      setStockLimit(draft.stockLimit ? String(draft.stockLimit) : '');
      if (draft.passFeeToPayer !== undefined) setPassFeeToPayer(Boolean(draft.passFeeToPayer));
      setCustomFields(Array.isArray(draft.customFields) ? draft.customFields : []);
      setErrors({});
      setAiNotice(
        `Configured via ${draft.engine || 'WePay AI'} — review the auto-filled fields below or publish immediately.`
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

  const validate = (): { message: string; fieldId: string } | null => {
    const next: FormErrors = {};
    if (!title.trim()) {
      next.title = 'Collection title is required.';
    } else if (title.trim().length < 3) {
      next.title = 'Collection title must be at least 3 characters.';
    }
    if (!description.trim()) {
      next.description = 'Your description cannot be empty.';
    } else if (description.trim().length < 10) {
      next.description = 'Your description must be at least 10 characters.';
    }

    const numAmount = Number(amount);
    if (pricingRule !== 'FLEXIBLE') {
      if (!amount || !Number.isFinite(numAmount) || numAmount < 100) {
        next.amount = 'Enter a valid Naira amount (minimum ₦100).';
      }
    }

    if (type === 'POOL') {
      const numTarget = Number(targetAmount);
      if (!targetAmount || !Number.isFinite(numTarget) || numTarget < 500) {
        next.targetAmount = 'Target amount must be at least ₦500.';
      } else if (pricingRule === 'FIXED' && Number.isFinite(numAmount) && numAmount > numTarget) {
        next.amount = 'Contribution amount cannot exceed the pool target.';
      }
    }

    if (type === 'INVENTORY') {
      const numStock = Number(stockLimit);
      if (!stockLimit || !Number.isInteger(numStock) || numStock < 1) {
        next.stockLimit = 'Stock limit must be a whole number of at least 1 unit.';
      }
    }

    if (type === 'INVENTORY' && maxQuantityPerOrder) {
      const numMaxQuantity = Number(maxQuantityPerOrder);
      if (!Number.isInteger(numMaxQuantity) || numMaxQuantity < 1 || numMaxQuantity > 20) {
        next.maxQuantityPerOrder = 'Max units per order must be a whole number from 1 to 20.';
      }
    }

    setErrors(next);
    const firstInvalidField = Object.keys(next)[0] as keyof FormErrors | undefined;
    if (!firstInvalidField) return null;

    const fieldIds: Record<keyof FormErrors, string> = {
      title: 'collection-title',
      description: 'collection-description',
      amount: 'collection-amount',
      targetAmount: 'collection-target-amount',
      stockLimit: 'collection-stock-limit',
      maxQuantityPerOrder: 'collection-max-quantity',
    };
    return {
      message: next[firstInvalidField]!,
      fieldId: fieldIds[firstInvalidField],
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionInProgress.current) return;

    setSubmitError(null);
    if (!hasSettlementBank) {
      setSubmitError(
        'Bank details are required before you can create a collection. Add your settlement bank account first.'
      );
      return;
    }
    const validationError = validate();
    if (validationError) {
      toast(validationError.message, 'error');
      window.requestAnimationFrame(() => {
        const invalidField = document.getElementById(validationError.fieldId);
        if (invalidField instanceof HTMLElement) {
          invalidField.focus({ preventScroll: true });
          invalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      return;
    }

    submissionInProgress.current = true;
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
      toast('Collection created successfully.', 'success');
      setCreatedCollection(collection);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to create collection. Please try again.'
      );
    } finally {
      submissionInProgress.current = false;
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
            <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
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
      <Card className="border-slate-200 bg-white">
        <div className="space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  AI Smart Collection Builder
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
              className="flex-1 h-10 px-3.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700"
            />
            <Button
              type="button"
              onClick={() => handleGenerateWithAi()}
              loading={aiGenerating}
              disabled={!aiPrompt.trim()}
            >
              {!aiGenerating && <Wand2 className="h-4 w-4" />}
              <span>{aiGenerating ? 'Generating...' : 'Auto-Fill Form'}</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 mr-1">Try:</span>
            {AI_PRESET_PROMPTS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleGenerateWithAi(preset)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-teal-300 hover:text-teal-800 transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          {aiNotice && (
            <div className="text-xs text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <span>{aiNotice}</span>
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
                      title: 'SPLIT',
                      desc: 'Assign structured obligations and track paid and unpaid participants toward a target.',
                      Icon: Users,
                    },
                    {
                      id: 'OPEN',
                      title: 'FLEXIBLE',
                      desc: 'Accept community contributions of any amount toward a shared cause or due.',
                      Icon: Layers,
                    },
                    {
                      id: 'INVENTORY',
                      title: 'INVENTORY',
                      desc: 'Sell limited products or tickets with unit prices, stock limits and buyer fields.',
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
                          ? 'border-teal-700 bg-teal-50 ring-1 ring-teal-700'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                          selected
                            ? 'bg-teal-700 text-white'
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
                id="collection-title"
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
                id="collection-description"
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
                    min={100}
                    required
                    id="collection-amount"
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
                    min={500}
                    required
                    id="collection-target-amount"
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
                      id="collection-stock-limit"
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
                      id="collection-max-quantity"
                      value={maxQuantityPerOrder}
                      onChange={(e) => setMaxQuantityPerOrder(e.target.value)}
                      error={errors.maxQuantityPerOrder}
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
                        ? 'border-teal-700 bg-teal-50'
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
                        ? 'border-teal-700 bg-teal-50'
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