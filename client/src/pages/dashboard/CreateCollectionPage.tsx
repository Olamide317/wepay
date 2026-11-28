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

interface CollectionFormDraft {
  mode: CollectionType;
  title: string;
  description: string;
  pricingRule: PricingRule;
  amount: string;
  targetAmount: string;
  stockLimit: string;
  maxQuantityPerOrder: string;
  feeHandling: 'ABSORB' | 'PASS_TO_PAYER';
  deadline: string;
  customFields: CustomField[];
  aiPrompt: string;
  aiAuditTips: string[];
}

const CREATE_COLLECTION_DRAFT_KEY = 'wepay_create_collection_draft';

function isStoredCustomField(value: unknown): value is CustomField {
  if (!value || typeof value !== 'object') return false;
  const field = value as Record<string, unknown>;
  const fieldTypes = ['short_text', 'long_text', 'email', 'phone', 'number', 'select', 'radio', 'checkbox', 'text'];
  return (
    typeof field.id === 'string' &&
    typeof field.label === 'string' &&
    field.label.trim().length > 0 &&
    typeof field.type === 'string' &&
    fieldTypes.includes(field.type) &&
    typeof field.required === 'boolean' &&
    (field.options === undefined || (Array.isArray(field.options) && field.options.every((option) => typeof option === 'string')))
  );
}

const AI_PRESET_PROMPTS = [
  '₦10 live pitch demo pass (2 slots, organizer absorbs fee)',
  'Split ₦75,000 hostel Starlink bill among 5 roommates',
];

export const CreateCollectionPage: React.FC = () => {
  const { organizer } = useAuth();
<<<<<<< HEAD
  const { showToast } = useToast();
  const [draftRestored, setDraftRestored] = useState(false);
  const storageErrorShown = useRef(false);
=======
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get('type');
  const initialType: CollectionType =
    requestedType === 'POOL' || requestedType === 'OPEN' || requestedType === 'INVENTORY'
      ? requestedType
      : 'POOL';
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4
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

<<<<<<< HEAD
  const persistDraft = (notifyStorageError = true): boolean => {
    try {
      window.sessionStorage.setItem(CREATE_COLLECTION_DRAFT_KEY, JSON.stringify({
        mode: type,
        title,
        description,
        pricingRule,
        amount,
        targetAmount,
        stockLimit,
        maxQuantityPerOrder,
        feeHandling: passFeeToPayer ? 'PASS_TO_PAYER' : 'ABSORB',
        deadline: expiresAt,
        customFields,
        aiPrompt,
        aiAuditTips,
      } satisfies CollectionFormDraft));
      return true;
    } catch {
      if (notifyStorageError && !storageErrorShown.current) {
        storageErrorShown.current = true;
        showToast('WePay could not save this draft in this tab. Keep this page open while you finish creating your collection.', 'error');
      }
      return false;
    }
  };

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(CREATE_COLLECTION_DRAFT_KEY);
      if (saved) {
        const draft: Partial<CollectionFormDraft> = JSON.parse(saved);
        if (draft.mode === 'POOL' || draft.mode === 'OPEN' || draft.mode === 'INVENTORY') setType(draft.mode);
        if (typeof draft.title === 'string') setTitle(draft.title);
        if (typeof draft.description === 'string') setDescription(draft.description);
        if (draft.pricingRule === 'FIXED' || draft.pricingRule === 'MINIMUM' || draft.pricingRule === 'FLEXIBLE') {
          setPricingRule(draft.pricingRule);
        }
        if (typeof draft.amount === 'string') setAmount(draft.amount);
        if (typeof draft.targetAmount === 'string') setTargetAmount(draft.targetAmount);
        if (typeof draft.stockLimit === 'string') setStockLimit(draft.stockLimit);
        if (typeof draft.maxQuantityPerOrder === 'string') setMaxQuantityPerOrder(draft.maxQuantityPerOrder);
        if (draft.feeHandling === 'ABSORB' || draft.feeHandling === 'PASS_TO_PAYER') {
          setPassFeeToPayer(draft.feeHandling === 'PASS_TO_PAYER');
        }
        if (typeof draft.deadline === 'string') setExpiresAt(draft.deadline);
        if (Array.isArray(draft.customFields)) setCustomFields(draft.customFields.filter(isStoredCustomField));
        if (typeof draft.aiPrompt === 'string') setAiPrompt(draft.aiPrompt);
        if (Array.isArray(draft.aiAuditTips)) setAiAuditTips(draft.aiAuditTips.filter((tip): tip is string => typeof tip === 'string'));
      }
    } catch {
      showToast('WePay could not restore your saved collection draft. You can continue entering your details here.', 'error');
    } finally {
      setDraftRestored(true);
    }
  }, [showToast]);

  useEffect(() => {
    if (draftRestored) persistDraft();
  }, [
    draftRestored,
    type,
    title,
    description,
    pricingRule,
    amount,
    targetAmount,
    stockLimit,
    maxQuantityPerOrder,
    passFeeToPayer,
    expiresAt,
    customFields,
    aiPrompt,
    aiAuditTips,
  ]);
=======
  useEffect(() => {
    setType(initialType);
  }, [initialType]);
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4

  const handleGenerateWithAi = async (promptOverride?: string) => {
    const query = (promptOverride ?? aiPrompt).trim();
    if (!query) return;
    if (promptOverride) setAiPrompt(promptOverride);

    setAiGenerating(true);
    setAiNotice(null);
    setSubmitError(null);
    try {
      const { draft, source } = await wepayService.draftCollectionWithAi(query);
      setType(draft.mode);
      setTitle(draft.title);
      setDescription(draft.description);
      setPricingRule(draft.pricingRule === 'OPEN' ? 'FLEXIBLE' : 'FIXED');
      setAmount(String(draft.amount));
      setTargetAmount(draft.targetAmount === null ? '' : String(draft.targetAmount));
      setStockLimit(draft.stockLimit === null ? '' : String(draft.stockLimit));
      setPassFeeToPayer(draft.feeHandling === 'PASS_TO_PAYER');
      setCustomFields(draft.customFields.map((field, idx) => ({
        id: `cf_${Date.now()}_${idx}`,
        label: field.label,
        type: field.type === 'number' ? 'number' : field.type === 'select' ? 'select' : 'text',
        required: field.required,
        options: field.type === 'select' ? field.options?.length ? field.options : ['Option 1', 'Option 2'] : undefined,
        order: idx,
      })));
      setAiAuditTips(draft.auditTips);
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

<<<<<<< HEAD
  const validate = (): FormErrors => {
=======
  const validate = (): { message: string; fieldId: string } | null => {
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4
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
<<<<<<< HEAD
    if (pricingRule !== 'FLEXIBLE' || type === 'INVENTORY') {
=======
    if (pricingRule !== 'FLEXIBLE') {
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4
      if (!amount || !Number.isFinite(numAmount) || numAmount < 10) {
        next.amount = 'Enter a valid Naira amount (minimum ₦10).';
      }
    }

    if (type === 'POOL') {
      const numTarget = Number(targetAmount);
      if (!targetAmount || !Number.isFinite(numTarget) || numTarget < 10) {
        next.targetAmount = 'Target amount must be at least ₦10.';
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
<<<<<<< HEAD
    return next;
=======
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
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionInProgress.current) return;

    setSubmitError(null);
    const validationErrors = validate();
    const issueMessages: string[] = [];
    if (!hasSettlementBank) {
      issueMessages.push('add your settlement bank account in Profile');
    }
    if (validationErrors.title) issueMessages.push(`Collection Title: ${validationErrors.title}`);
    if (validationErrors.description) issueMessages.push(`Description: ${validationErrors.description}`);
    if (validationErrors.amount) issueMessages.push(`Amount: ${validationErrors.amount}`);
    if (validationErrors.targetAmount) issueMessages.push(`Target Amount: ${validationErrors.targetAmount}`);
    if (validationErrors.stockLimit) issueMessages.push(`Stock Limit: ${validationErrors.stockLimit}`);

    if (issueMessages.length > 0) {
      const draftSaved = persistDraft(false);
      showToast(
        `Cannot publish yet: ${issueMessages.join('; ')}. ${
          draftSaved ? 'Your form draft is saved.' : 'Browser storage is unavailable; keep this page open to retain your input.'
        }`,
        'error'
      );
      return;
    }
<<<<<<< HEAD

    persistDraft();
=======
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
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4
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
<<<<<<< HEAD
      try {
        window.sessionStorage.removeItem(CREATE_COLLECTION_DRAFT_KEY);
      } catch {
        showToast('Your collection was created, but the saved draft could not be cleared from this tab.', 'info');
      }
=======
      toast('Collection created successfully.', 'success');
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4
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
          Tell us what you’re collecting, set the details, and share a link. Start with AI or fill in the form yourself.
        </p>
      </div>

      {!hasSettlementBank && (
        <AlertBanner
          variant="warning"
          title="Settlement bank details required"
          message="Add your bank account before you publish. Your collection draft will be here when you return."
          action={
            <Link
              to="/dashboard/profile?returnTo=%2Fdashboard%2Fcreate"
              state={{ returnTo: '/dashboard/create' }}
            >
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
                  Describe with WePay AI
                </h2>
                <p className="text-xs text-slate-600">
                  Tell us what you need to collect. We’ll suggest a title, price, target or stock, and buyer questions.
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
<<<<<<< HEAD
              placeholder="e.g. Split the ₦75,000 Starlink bill among 5 roommates..."
              className="flex-1 h-10 px-3.5 rounded-lg border border-indigo-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
=======
              placeholder="e.g. Split ₦75,000 Starlink bill among 5 roommates..."
              className="flex-1 h-10 px-3.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700"
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4
            />
            <Button
              type="button"
              onClick={() => handleGenerateWithAi()}
              loading={aiGenerating}
              disabled={!aiPrompt.trim()}
            >
              {!aiGenerating && <Wand2 className="h-4 w-4" />}
              <span>{aiGenerating ? 'Generating...' : 'Generate with AI'}</span>
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
                  Pick the option that fits what you’re collecting.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {(
                  [
                    {
                      id: 'POOL',
<<<<<<< HEAD
                      title: 'Bill Split & Group Pool',
                      desc: 'Split a shared bill or pool funds toward a fixed target — like a ₦75,000 Starlink subscription or group gift.',
=======
                      title: 'SPLIT',
                      desc: 'Assign structured obligations and track paid and unpaid participants toward a target.',
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4
                      Icon: Users,
                    },
                    {
                      id: 'OPEN',
<<<<<<< HEAD
                      title: 'Open Collection & Dues',
                      desc: 'Collect departmental dues, levies, or open group contributions with instant receipt tracking.',
=======
                      title: 'FLEXIBLE',
                      desc: 'Accept community contributions of any amount toward a shared cause or due.',
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4
                      Icon: Layers,
                    },
                    {
                      id: 'INVENTORY',
<<<<<<< HEAD
                      title: 'Pre-Order & Event Tickets',
                      desc: 'Sell limited-stock items, snack boxes, or event tickets with automatic stock locking and buyer fields.',
=======
                      title: 'INVENTORY',
                      desc: 'Sell limited products or tickets with unit prices, stock limits and buyer fields.',
>>>>>>> 032fd78438db8006491bb34ed92c96b5600174c4
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
                  This is what people will see when they open your collection link.
                </p>
              </div>

              <Input
                label={type === 'INVENTORY' ? 'Product / Pre-Order Title' : 'Collection Title'}
                required
                id="collection-title"
                placeholder={
                  type === 'POOL'
                    ? 'e.g. Starlink bill for the flat'
                    : type === 'INVENTORY'
                    ? 'e.g. Campus snack box pre-order'
                    : 'e.g. NACOS departmental dues'
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
                    ? 'What’s included, and where or when can buyers collect it?'
                    : 'What is the money for? Add any useful details for contributors.'
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
                  Enter your price and, for a group pool, the total you’re aiming to raise.
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
                    min={10}
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
                  Choose who covers the payment fee and, if needed, when the collection ends.
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
                hint="Leave blank if contributors can pay at any time."
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