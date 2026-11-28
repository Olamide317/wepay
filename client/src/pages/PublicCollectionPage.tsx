import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Lock,
  Minus,
  Package,
  PauseCircle,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DynamicCustomFieldInput } from '../components/FormBuilder/DynamicCustomFieldInput';
import { InterswitchCheckoutModal } from '../components/InterswitchCheckoutModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/FormControls';
import { ProgressBar } from '../components/ui/ProgressBar';
import { AlertBanner, LoadingRows } from '../components/ui/StateViews';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PublicLayout } from '../layouts/PublicLayout';
import { wepayService } from '../services/wepayService';
import {
  Collection,
  CustomFieldAnswer,
  InterswitchCheckoutParams,
} from '../types/wepay';
import {
  calculateProcessingFee,
  formatDate,
  formatNaira,
  getEmailTypoSuggestion,
  getCollectionModeLabel,
  isValidEmail,
  isValidNigerianPhone,
  isValidPhoneInput,
  normalizeFieldType,
} from '../utils/formatters';

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  amount?: string;
  custom?: Record<string, string>;
}

export const PublicCollectionPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTxnRef = searchParams.get('txnref') || searchParams.get('txnRef');

  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  // Contributor form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const emailSuggestion = getEmailTypoSuggestion(email);
  const [phone, setPhone] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | string[]>>({});

  const [errors, setErrors] = useState<FormErrors>({});
  const [initError, setInitError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  // Interswitch checkout modal state
  const [checkoutParams, setCheckoutParams] = useState<InterswitchCheckoutParams | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (!returnTxnRef) return;

    let active = true;
    setInitializing(true);
    setInitError(null);
    wepayService
      .verifyPaymentByReference(returnTxnRef)
      .then(({ transaction, interswitchResponse, verificationError }) => {
        if (!active) return;
        if (transaction.status !== 'SUCCESS') {
          const reason =
            verificationError ||
            interswitchResponse?.ResponseDescription ||
            (interswitchResponse?.ResponseCode
              ? `Interswitch response ${interswitchResponse.ResponseCode}.`
              : 'No successful confirmation was returned.');
          throw new Error(`Payment is not confirmed: ${reason}`);
        }
        navigate(`/receipt/${encodeURIComponent(transaction.receiptCode)}`, { replace: true });
      })
      .catch((err) => {
        if (active) {
          setInitError(
            err instanceof Error ? err.message : 'Unable to verify the returned Interswitch payment.'
          );
          setInitializing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [returnTxnRef, navigate]);

  useEffect(() => {
    let active = true;
    async function loadCollection() {
      if (!slug) {
        setLoadError('Invalid collection link.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const res = await wepayService.getPublicCollection(slug);
        if (!active) return;
        setCollection(res.collection);

        // Initialize custom field values keyed by field.id
        const defaults: Record<string, string | string[]> = {};
        res.collection.customFields.forEach((cf) => {
          const normalized = normalizeFieldType(cf.type);
          if (normalized === 'checkbox') {
            defaults[cf.id] = [];
          } else {
            defaults[cf.id] = '';
          }
        });
        setCustomFieldValues(defaults);
        if (res.collection.type !== 'INVENTORY' && res.collection.amount > 0) {
          setCustomAmount(String(res.collection.amount));
        }
      } catch (err) {
        if (active) {
          setLoadError(
            err instanceof Error ? err.message : 'This collection link could not be found.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCollection();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <PublicLayout>
        <Card>
          <LoadingRows rows={6} />
        </Card>
      </PublicLayout>
    );
  }

  if (loadError || !collection) {
    return (
      <PublicLayout maxWidth="md">
        <Card padding="lg" className="text-center space-y-4">
          <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="font-display text-xl font-bold text-slate-900">
              Collection Link Unavailable
            </h1>
            <p className="text-sm text-slate-600">
              {loadError || 'This collection link is invalid or has been removed.'}
            </p>
          </div>
          <div className="pt-2">
            <Link to="/">
              <Button variant="outline">Return to WePay Home</Button>
            </Link>
          </div>
        </Card>
      </PublicLayout>
    );
  }

  const orderedCustomFields = [...collection.customFields].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  const remainingPool =
    collection.type === 'POOL' && collection.targetAmount
      ? Math.max(0, collection.targetAmount - collection.amountRaised)
      : 0;
  const poolPct =
    collection.type === 'POOL' && collection.targetAmount
      ? Math.min(100, Math.round((collection.amountRaised / collection.targetAmount) * 100))
      : 0;

  const remainingStock =
    collection.type === 'INVENTORY' && collection.stockLimit !== undefined
      ? Math.max(0, collection.stockLimit - (collection.stockSold ?? 0))
      : 0;
  const maxOrderQty =
    collection.type === 'INVENTORY'
      ? Math.min(remainingStock, collection.maxQuantityPerOrder || 5)
      : 1;

  const isTargetReached = collection.type === 'POOL' && remainingPool <= 0;
  const isOutOfStock = collection.type === 'INVENTORY' && remainingStock <= 0;
  const isUnavailable =
    collection.status !== 'ACTIVE' || isTargetReached || isOutOfStock;

  const effectiveBaseAmount =
    collection.type === 'INVENTORY'
      ? collection.amount * quantity
      : collection.pricingRule === 'FIXED'
      ? collection.amount
      : Number(customAmount) || 0;
  const processingFee = collection.passFeeToPayer
    ? calculateProcessingFee(effectiveBaseAmount)
    : 0;
  const totalPayable = effectiveBaseAmount + processingFee;

  const validate = (): boolean => {
    const next: FormErrors = { custom: {} };
    if (!fullName.trim() || fullName.trim().length < 2) {
      next.fullName = 'Please enter your full name.';
    }
    if (!email.trim() || !isValidEmail(email)) {
      next.email = 'Please enter a valid email address for your receipt.';
    }
    if (!phone.trim() || !isValidNigerianPhone(phone)) {
      next.phone = 'Enter a valid Nigerian phone number (e.g. 0803 123 4567).';
    }

    if (collection.type !== 'INVENTORY' && collection.pricingRule !== 'FIXED') {
      const val = Number(customAmount);
      const minRequired =
        collection.pricingRule === 'MINIMUM' ? collection.amount : 100;
      if (!customAmount || Number.isNaN(val) || val < minRequired) {
        next.amount = `Minimum contribution is ${formatNaira(minRequired)}.`;
      } else if (collection.type === 'POOL' && val > remainingPool) {
        next.amount = `Contribution cannot exceed the remaining pool balance of ${formatNaira(
          remainingPool
        )}.`;
      }
    }

    orderedCustomFields.forEach((field) => {
      const normalized = normalizeFieldType(field.type);
      const rawVal = customFieldValues[field.id];

      if (normalized === 'checkbox') {
        const arr = Array.isArray(rawVal) ? rawVal : [];
        if (field.required && arr.length === 0) {
          next.custom![field.id] = `Please select at least one option for ${field.label}.`;
        }
        return;
      }

      const strVal = typeof rawVal === 'string' ? rawVal.trim() : '';
      if (field.required && !strVal) {
        next.custom![field.id] = `${field.label} is required.`;
        return;
      }

      if (strVal) {
        if (normalized === 'email' && !isValidEmail(strVal)) {
          next.custom![field.id] = 'Please enter a valid email address.';
        } else if (normalized === 'phone' && !isValidPhoneInput(strVal)) {
          next.custom![field.id] = 'Please enter a valid phone number.';
        } else if (normalized === 'number' && Number.isNaN(Number(strVal))) {
          next.custom![field.id] = 'Please enter a valid number.';
        }
      }
    });

    if (Object.keys(next.custom!).length === 0) {
      delete next.custom;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleInitializePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUnavailable || initializing) return;
    setInitError(null);
    if (!validate()) return;

    const customResponses: Record<string, string | string[]> = {};
    const customFieldAnswers: CustomFieldAnswer[] = [];

    orderedCustomFields.forEach((field) => {
      const raw = customFieldValues[field.id];
      const normalized = normalizeFieldType(field.type);
      if (normalized === 'checkbox') {
        const arr = Array.isArray(raw) ? raw : [];
        if (arr.length > 0) {
          customResponses[field.label] = arr;
          customFieldAnswers.push({
            fieldId: field.id,
            label: field.label,
            type: normalized,
            value: arr,
          });
        }
      } else {
        const str = typeof raw === 'string' ? raw.trim() : '';
        if (str) {
          customResponses[field.label] = str;
          customFieldAnswers.push({
            fieldId: field.id,
            label: field.label,
            type: normalized,
            value: str,
          });
        }
      }
    });

    setInitializing(true);
    try {
      const res = await wepayService.initializePayment({
        slug: collection.slug,
        contributorName: fullName,
        contributorEmail: email,
        contributorPhone: phone,
        amount: collection.type === 'INVENTORY' ? undefined : effectiveBaseAmount,
        quantity: collection.type === 'INVENTORY' ? quantity : 1,
        customResponses,
        customFieldAnswers,
      });
      setCheckoutParams(res.checkoutParams);
      setCheckoutOpen(true);
    } catch (err) {
      setInitError(
        err instanceof Error
          ? err.message
          : 'Unable to initialize payment. Please check your details and try again.'
      );
    } finally {
      setInitializing(false);
    }
  };

  const handleCheckoutComplete = async () => {
    if (!checkoutParams) return;
    setCheckoutOpen(false);
    setInitError(null);
    try {
      const { transaction, interswitchResponse, verificationError } =
        await wepayService.verifyPaymentByReference(checkoutParams.txnRef);
      if (transaction.status !== 'SUCCESS') {
        const reason =
          verificationError ||
          interswitchResponse?.ResponseDescription ||
          (interswitchResponse?.ResponseCode
            ? `Interswitch response ${interswitchResponse.ResponseCode}.`
            : 'No successful confirmation was returned.');
        throw new Error(`Payment is not confirmed: ${reason}`);
      }
      navigate(`/receipt/${encodeURIComponent(transaction.receiptCode)}`);
    } catch (err) {
      setInitError(
        err instanceof Error ? err.message : 'Unable to verify the Interswitch transaction.'
      );
    }
  };

  return (
    <PublicLayout maxWidth="md">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Left Column: Collection Details */}
        <div className="space-y-5">
          <Card padding="lg" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                {getCollectionModeLabel(collection.type)}
              </span>
              <StatusBadge status={collection.status} />
            </div>

            {/* Product Image for Inventory Mode with CSS/SVG fallback */}
            {collection.type === 'INVENTORY' && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 aspect-[4/3]">
                {collection.productImageUrl && !imageFailed ? (
                  <img
                    src={collection.productImageUrl}
                    alt={collection.title}
                    referrerPolicy="no-referrer"
                    onError={() => setImageFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100 p-6 text-center">
                    <Package className="h-10 w-10 text-slate-400 mb-2" />
                    <span className="text-sm font-medium text-slate-700">{collection.title}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
                {collection.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                <span>
                  Organized by{' '}
                  <strong className="font-semibold text-slate-900">
                    {collection.organizerName}
                  </strong>
                </span>
                {collection.organizerVerified && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-teal-700 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Verified Organizer
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed pt-1">
                {collection.description}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2.5">
              <p className="text-xs font-semibold text-slate-700">Checkout methods</p>
              <div className="flex flex-wrap gap-2">
                {['Verve', 'Mastercard', 'Visa', 'Bank Transfer', 'USSD'].map((rail) => (
                  <span
                    key={rail}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
                  >
                    {rail}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Payment options depend on what Interswitch makes available at checkout.
              </p>
            </div>

            {/* Mode-Specific Progress / Pricing Card */}
            {collection.type === 'POOL' && collection.targetAmount && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-xs text-slate-500 block">Raised</span>
                    <span className="text-base sm:text-lg font-bold font-mono-num text-slate-900">
                      {formatNaira(collection.amountRaised, false)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Remaining</span>
                    <span className="text-base sm:text-lg font-bold font-mono-num text-teal-800">
                      {formatNaira(remainingPool, false)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Target</span>
                    <span className="text-base sm:text-lg font-semibold font-mono-num text-slate-700">
                      {formatNaira(collection.targetAmount, false)}
                    </span>
                  </div>
                </div>
                <ProgressBar value={poolPct} />
                <div className="flex items-center justify-between text-xs text-slate-600 font-mono-num">
                  <span>{poolPct}% completed</span>
                  <span>{collection.contributorCount ?? 0} contributor(s)</span>
                </div>
              </div>
            )}

            {collection.type === 'OPEN' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    {collection.pricingRule === 'FIXED'
                      ? 'Contribution Amount'
                      : collection.pricingRule === 'MINIMUM'
                      ? 'Minimum Contribution'
                      : 'Flexible Contribution'}
                  </span>
                  <span className="text-xl font-bold font-mono-num text-slate-900">
                    {collection.pricingRule === 'FLEXIBLE'
                      ? 'Any amount'
                      : formatNaira(collection.amount)}
                  </span>
                </div>
                {collection.expiresAt && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Deadline: {formatDate(collection.expiresAt)}</span>
                  </div>
                )}
              </div>
            )}

            {collection.type === 'INVENTORY' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">Unit Price</span>
                    <span className="text-xl font-bold font-mono-num text-slate-900">
                      {formatNaira(collection.amount)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Availability</span>
                    <span
                      className={`text-sm font-semibold font-mono-num ${
                        remainingStock > 0 ? 'text-teal-700' : 'text-red-700'
                      }`}
                    >
                      {remainingStock > 0
                        ? `${remainingStock} of ${collection.stockLimit} left`
                        : 'Sold out'}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-mono-num">
                  {collection.stockSold ?? 0} units pre-ordered so far
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Contributor Payment Form */}
        <div>
          {isUnavailable ? (
            <Card padding="lg" className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  {collection.status === 'PAUSED' ? (
                    <PauseCircle className="h-5 w-5 text-[#f59e08]" />
                  ) : isTargetReached || collection.status === 'COMPLETED' ? (
                    <CheckCircle2 className="h-5 w-5 text-teal-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {collection.status === 'PAUSED'
                      ? 'Collection Temporarily Paused'
                      : isOutOfStock
                      ? 'Stock Unavailable — Sold Out'
                      : isTargetReached || collection.status === 'COMPLETED'
                      ? 'Collection Completed'
                      : 'Collection Closed'}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {collection.status === 'PAUSED'
                      ? 'The organizer has temporarily paused incoming payments for this collection. Please check back later.'
                      : isOutOfStock
                      ? 'All available stock units for this pre-order have been claimed.'
                      : isTargetReached || collection.status === 'COMPLETED'
                      ? 'This collection has reached its goal and is no longer accepting new payments.'
                      : 'This collection has been closed by the organizer and is no longer accepting payments.'}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <Link to={`/u/${collection.organizerHandle}`}>
                  <Button variant="outline" size="sm">
                    View other collections by {collection.organizerName}
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card padding="lg">
              <form onSubmit={handleInitializePayment} noValidate className="space-y-5">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900">
                    {collection.type === 'INVENTORY'
                      ? 'Inventory Details'
                      : 'Contributor Information'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    No WePay account required. Your QR receipt will be generated after payment.
                  </p>
                </div>

                {initError && <AlertBanner variant="error" message={initError} />}

                {/* Inventory Quantity Selector */}
                {collection.type === 'INVENTORY' && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Quantity</p>
                      <p className="text-xs text-slate-500">
                        Max {maxOrderQty} per order · {remainingStock} available
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                        className="h-10 w-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-mono-num font-semibold text-slate-900">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(maxOrderQty, q + 1))}
                        disabled={quantity >= maxOrderQty}
                        aria-label="Increase quantity"
                        className="h-10 w-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Variable / Minimum Contribution Amount Input */}
                {collection.type !== 'INVENTORY' && collection.pricingRule !== 'FIXED' && (
                  <Input
                    label={
                      collection.pricingRule === 'MINIMUM'
                        ? `Contribution Amount (Min ${formatNaira(collection.amount, false)})`
                        : 'Contribution Amount (NGN)'
                    }
                    type="number"
                    min={collection.pricingRule === 'MINIMUM' ? collection.amount : 100}
                    max={collection.type === 'POOL' ? remainingPool : undefined}
                    required
                    leftAddon="₦"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    error={errors.amount}
                  />
                )}

                <Input
                  label="Full name"
                  required
                  autoComplete="name"
                  placeholder="e.g. Chinedu Okafor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  error={errors.fullName}
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Input
                      label="Email address"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={errors.email}
                    />
                    {emailSuggestion && (
                      <p className="text-xs text-slate-600">
                        Did you mean{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setEmail(emailSuggestion);
                            setErrors((previous) => ({ ...previous, email: undefined }));
                          }}
                          className="font-semibold text-teal-700 underline underline-offset-2"
                        >
                          {emailSuggestion}
                        </button>
                        ?
                      </p>
                    )}
                  </div>
                  <Input
                    label="Phone number"
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="0803 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={errors.phone}
                  />
                </div>

                {/* Dynamic Custom Contributor Information Fields */}
                {orderedCustomFields.map((field) => (
                  <DynamicCustomFieldInput
                    key={field.id}
                    field={field}
                    value={customFieldValues[field.id]}
                    onChange={(val) =>
                      setCustomFieldValues((prev) => ({
                        ...prev,
                        [field.id]: val,
                      }))
                    }
                    error={errors.custom?.[field.id]}
                  />
                ))}

                {/* Payment Summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {collection.type === 'INVENTORY'
                        ? `Subtotal (${quantity} × ${formatNaira(collection.amount, false)})`
                        : 'Contribution amount'}
                    </span>
                    <span className="font-mono-num font-medium text-slate-900">
                      {formatNaira(effectiveBaseAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>Processing fee</span>
                    <span className="font-mono-num font-medium text-slate-700">
                      {collection.passFeeToPayer
                        ? formatNaira(processingFee)
                        : '₦0.00 (Covered by organizer)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-900">Total payable</span>
                    <span className="text-lg font-bold font-mono-num text-slate-900">
                      {formatNaira(totalPayable)}
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="payment"
                  fullWidth
                  size="lg"
                  loading={initializing}
                  disabled={initializing}
                >
                  <Lock className="h-4 w-4" />
                  <span>
                    {initializing
                      ? 'Initializing Interswitch Checkout...'
                      : collection.type === 'INVENTORY'
                      ? `Complete Order · ${formatNaira(totalPayable)}`
                      : `Pay Now · ${formatNaira(totalPayable)}`}
                  </span>
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>

      <InterswitchCheckoutModal
        open={checkoutOpen}
        params={checkoutParams}
        collectionTitle={collection.title}
        contributorEmail={email}
        onClose={() => setCheckoutOpen(false)}
        onCompleteVerification={handleCheckoutComplete}
      />
    </PublicLayout>
  );
};
