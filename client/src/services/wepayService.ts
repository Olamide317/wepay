import {
  AdminOverviewData,
  Collection,
  CollectionStatus,
  CreateCollectionInput,
  AiNavigatorResponse,
  AiCollectionDraft,
  AiLedgerAnswer,
  AiCollectionAnalysis,
  AiFraudRadar,
  InterswitchCheckoutParams,
  Organizer,
  PaymentInitializeRequest,
  ReceiptData,
  SettlementBank,
  Transaction,
} from '../types/wepay';
import { formatDisplayName, slugify } from '../utils/formatters';
import { apiRequest, setAuthToken } from './apiClient';

// Normalizes backend { user } or { organizer } objects into Joshua's Organizer interface
function normalizeOrganizer(raw: any): Organizer {
  const email = String(raw?.email || '');
  const rawFullName = String(raw?.fullName || raw?.name || email.split('@')[0] || 'Organizer');
  const fullName = formatDisplayName(rawFullName) || 'Organizer';
  const handle = slugify(raw?.handle || fullName || email.split('@')[0] || 'organizer');

  return {
    _id: String(raw?._id || raw?.id || ''),
    fullName,
    email,
    phone: String(raw?.phone || ''),
    handle,
    avatarUrl: raw?.avatarUrl,
    avatarStorage: raw?.avatarUrl ? 'remote' : 'none',
    avatarUpdatedAt: raw?.avatarUpdatedAt,
    settlementBank: raw?.settlementBank,
    verified: Boolean(raw?.verified),
    isFounder: Boolean(raw?.isFounder),
    role: raw?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ORGANIZER',
    createdAt: raw?.createdAt || new Date().toISOString(),
  };
}

// Normalizes backend collection documents into Joshua's Collection interface
function normalizeCollection(raw: any): Collection {
  const inferredType =
    raw?.type ||
    (raw?.mode === 'SPLIT' ? 'POOL' : raw?.mode === 'FIXED' ? 'INVENTORY' : 'OPEN');

  const inferredPricingRule =
    raw?.pricingRule || (raw?.mode === 'OPEN' ? 'OPEN' : 'FIXED');

  return {
    _id: String(raw?._id || raw?.id || ''),
    organizerId:
      typeof raw?.organizerId === 'string'
        ? raw.organizerId
        : String(raw?.organizer?._id || raw?.organizer || ''),
    organizerName:
      formatDisplayName(String(raw?.organizerName || raw?.organizer?.fullName || 'Organizer')) ||
      'Organizer',
    organizerHandle: String(
      raw?.organizerHandle ||
        raw?.organizer?.handle ||
        slugify(raw?.organizer?.fullName || 'organizer')
    ),
    organizerVerified: Boolean(raw?.organizerVerified ?? raw?.organizer?.verified),
    slug: String(raw?.slug || ''),
    type: inferredType,
    title: String(raw?.title || ''),
    description: String(raw?.description || ''),
    currency: 'NGN',
    pricingRule: inferredPricingRule,
    amount: Number(raw?.amount ?? raw?.perPersonAmount ?? raw?.totalTarget ?? 0),
    targetAmount:
      raw?.targetAmount !== undefined
        ? Number(raw.targetAmount)
        : raw?.totalTarget !== undefined
        ? Number(raw.totalTarget)
        : undefined,
    amountRaised: Number(raw?.amountRaised ?? raw?.totalCollected ?? raw?.collectedAmount ?? 0),
    stockLimit: raw?.stockLimit !== undefined && raw?.stockLimit !== null ? Number(raw.stockLimit) : undefined,
    stockSold: Number(raw?.stockSold ?? raw?.paidCount ?? 0),
    productImageUrl: raw?.productImageUrl || undefined,
    maxQuantityPerOrder:
      raw?.maxQuantityPerOrder !== undefined ? Number(raw.maxQuantityPerOrder) : 5,
    passFeeToPayer: raw?.passFeeToPayer !== undefined ? Boolean(raw.passFeeToPayer) : true,
    customFields: Array.isArray(raw?.customFields) ? raw.customFields : [],
    status: String(raw?.status || 'ACTIVE').toUpperCase() as CollectionStatus,
    expiresAt: raw?.expiresAt,
    createdAt: raw?.createdAt || new Date().toISOString(),
    contributorCount: Number(raw?.contributorCount ?? raw?.paidCount ?? 0),
  };
}

function normalizeTransaction(raw: Transaction): Transaction {
  return {
    ...raw,
    contributorName: formatDisplayName(String(raw?.contributorName || '')) || raw?.contributorName,
  };
}

export const wepayService = {
  // ---------------------------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------------------------
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  },

  async resetPassword(
    token: string,
    password: string
  ): Promise<{ token: string; user: Organizer }> {
    const res = await apiRequest<{ token: string; user: unknown }>(
      `/api/auth/reset-password/${encodeURIComponent(token)}`,
      {
        method: 'POST',
        body: JSON.stringify({ password }),
      }
    );
    return { token: res.token, user: normalizeOrganizer(res.user) };
  },

  async login(payload: { email: string; password: string; remember?: boolean }): Promise<{
    organizer: Organizer;
    token: string;
  }> {
    const res = await apiRequest<{ token: string; organizer?: unknown; user?: unknown }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email: payload.email, password: payload.password }),
      }
    );
    setAuthToken(res.token, payload.remember ?? true);
    return { organizer: normalizeOrganizer(res.organizer || res.user), token: res.token };
  },

  async register(payload: {
    fullName: string;
    email: string;
    phone: string;
    handle: string;
    password: string;
  }): Promise<{ organizer: Organizer; token: string }> {
    const res = await apiRequest<{ token: string; organizer?: unknown; user?: unknown }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    setAuthToken(res.token, true);
    return { organizer: normalizeOrganizer(res.organizer || res.user), token: res.token };
  },

  async updateSettlementBank(bank: SettlementBank): Promise<{ organizer: Organizer }> {
    const res = await apiRequest<{ organizer?: unknown; user?: unknown }>(
      '/api/profile/bank',
      {
        method: 'POST',
        body: JSON.stringify(bank),
      },
      true
    );
    return { organizer: normalizeOrganizer(res.organizer || res.user) };
  },

  async updateOrganizerName(fullName: string): Promise<{ organizer: Organizer }> {
    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      throw new Error('Full name must be at least 2 characters.');
    }

    throw new Error(
      'Server-side profile name update endpoint is not yet enabled on the configured backend.'
    );
  },

  async updateProfilePicture(
    imageBlob: Blob,
    fileName: string
  ): Promise<{ organizer: Organizer }> {
    void imageBlob;
    void fileName;
    throw new Error(
      'Server-side profile picture upload endpoint is not yet enabled on the configured backend.'
    );
  },

  async removeProfilePicture(): Promise<{ organizer: Organizer }> {
    throw new Error(
      'Server-side profile picture removal endpoint is not yet enabled on the configured backend.'
    );
  },

  async getCurrentOrganizer(): Promise<Organizer> {
    const res = await apiRequest<{ organizer?: unknown; user?: unknown }>(
      '/api/auth/me',
      {},
      true
    );
    return normalizeOrganizer(res.organizer || res.user);
  },

  async askWePayNavigator(
    message: string,
    currentPath: string
  ): Promise<AiNavigatorResponse> {
    if (isBackendConfigured()) {
      return apiRequest<AiNavigatorResponse>(
        '/api/ai/navigate',
        { method: 'POST', body: JSON.stringify({ message, currentPath }) },
        false
      );
    }
    await delay(180);
    const lower = message.toLowerCase();
    if (/fee|charge|percent|1\.5/.test(lower)) {
      return {
        reply: 'WePay charges a 1.5% payment fee; the payer can cover it or the organizer can absorb it when creating a collection. Review the fee setting before publishing.',
        actions: [{ label: 'Create Collection', route: '/dashboard/create', description: 'Choose who covers the payment fee' }],
        source: 'smart-fallback',
      };
    }
    if (/withdraw|bank|account|settlement|payout/.test(lower)) {
      return {
        reply: 'Settlements are processed T+1 through Interswitch to the bank account saved in your Profile. Add or update that account before collecting payments.',
        actions: [{ label: 'Go to Profile', route: '/dashboard/profile', description: 'Manage settlement bank details' }],
        source: 'smart-fallback',
      };
    }
    if (/receipt|proof of payment/.test(lower)) {
      return {
        reply: 'After Interswitch confirms a successful payment, WePay automatically emails the payer a receipt through Brevo. Organizers can verify the transaction in the ledger.',
        actions: [{ label: 'View Transactions', route: '/dashboard/transactions', description: 'Check confirmed payments' }],
        source: 'smart-fallback',
      };
    }
    if (/share|sharing|qr|barcode|collection link/.test(lower)) {
      return {
        reply: 'Open a collection and use Share to copy its public payment link or show its QR code. Payers can complete checkout through Interswitch.',
        actions: [{ label: 'My Collections', route: '/dashboard/collections', description: 'Open a collection to share its link or QR' }],
        source: 'smart-fallback',
      };
    }
    if (/ticket|create|collection|link|pre.?order|pool|dues|collect/.test(lower)) {
      return {
        reply: 'Create a Bill Pool for shared costs, an Inventory Pre-Order for limited items, or Open Dues for flexible contributions. Set the pricing, target or stock, then share your link.',
        actions: [{ label: 'Create Collection', route: '/dashboard/create', description: 'Build a new collection' }],
        source: 'smart-fallback',
      };
    }
    if (/who.*pay|who don pay|payer|transaction|ledger|pending|failed|paid|csv|export/.test(lower)) {
      return {
        reply: 'Open Transactions to search payers and check successful, pending, or failed payments; you can also export the records as CSV. Use the verified status in the ledger to confirm payment.',
        actions: [{ label: 'Open Transactions', route: '/dashboard/transactions', description: 'Search payers and export transaction records' }],
        source: 'smart-fallback',
      };
    }
    if (/card|transfer|ussd|interswitch|secure|safe/.test(lower)) {
      return {
        reply: 'Live checkout runs through Interswitch and supports Card, Transfer, and USSD. WePay verifies payments before marking them successful or issuing receipts; never share your OTP.',
        actions: [{ label: 'View Transactions', route: '/dashboard/transactions', description: 'Review verified payments' }],
        source: 'smart-fallback',
      };
    }
    return {
      reply: 'WePay supports Bill Pooling, Inventory Pre-Orders, and Open Dues, with live Interswitch checkout and automatic email receipts. Ask me about fees, settlements, sharing links, receipts, or checking who paid.',
      actions: [
        { label: 'Open Dashboard', route: '/dashboard', description: 'Organizer dashboard' },
        { label: 'View Transactions', route: '/dashboard/transactions', description: 'Search payment records' },
      ],
      source: 'smart-fallback',
    };
  },

  async draftCollectionWithAi(prompt: string): Promise<{ draft: AiCollectionDraft; source: 'gemini' | 'smart-fallback' }> {
    if (isBackendConfigured()) {
      return apiRequest<{ draft: AiCollectionDraft; source: 'gemini' | 'smart-fallback' }>(
        '/api/ai/draft-collection',
        { method: 'POST', body: JSON.stringify({ prompt }) },
        true
      );
    }
    await delay(350);
    const lower = prompt.toLowerCase();
    const mode = /(ticket|slot|merch|shirt|pass|seat|pre.?order)/i.test(lower)
      ? 'INVENTORY'
      : /(donat|support|gift|open contribution)/i.test(lower)
      ? 'OPEN'
      : 'POOL';
    const explicitAmount = prompt.match(/(?:₦|NGN)\s*([\d][\d,]*(?:\.\d+)?)/i);
    const parsedAmount = explicitAmount
      ? Math.max(10, Math.round(Number(explicitAmount[1].replace(/,/g, ''))))
      : 10;
    const splitCount = lower.match(/(?:among|between)\s+(\d{1,4})/i);
    const count = splitCount ? Number(splitCount[1]) : null;
    const targetAmount = mode === 'POOL' ? parsedAmount : null;
    const stockMatch = lower.match(/(\d{1,6})\s*(?:tickets?|slots?|units?|seats?|shirts?|passes?)/i);
    const customFields: AiCollectionDraft['customFields'] = [];
    if (/matric|nacos|departmental|campus|student|dues/i.test(lower)) {
      customFields.push({ label: 'Matric Number', type: 'text', required: true });
    }
    if (/department/i.test(lower)) customFields.push({ label: 'Department', type: 'text', required: true });
    if (/phone|whatsapp/i.test(lower)) customFields.push({ label: 'Phone Number', type: 'text', required: true });
    if (/shirt|size|merch/i.test(lower)) {
      customFields.push({ label: 'T-Shirt Size', type: 'select', required: true, options: ['S', 'M', 'L', 'XL', 'XXL'] });
    }
    if (/level/i.test(lower)) customFields.push({ label: 'Level', type: 'text', required: true });
    if (/hostel|room/i.test(lower)) customFields.push({ label: 'Hostel / Room', type: 'text', required: true });
    return {
      draft: {
        title: prompt.slice(0, 60) || 'WePay Collection',
        description: `Collection for ${prompt}`,
        mode,
        pricingRule: mode === 'INVENTORY' ? 'UNIT' : mode === 'OPEN' ? 'OPEN' : 'FIXED',
        amount: mode === 'POOL' && count ? Math.max(10, Math.ceil(parsedAmount / count)) : parsedAmount,
        targetAmount,
        stockLimit: mode === 'INVENTORY' ? stockMatch ? Number(stockMatch[1]) : 50 : null,
        feeHandling: /\b(absorb|organizer absorbs|no fee)\b/i.test(lower) ? 'ABSORB' : 'PASS_TO_PAYER',
        customFields,
        auditTips: mode === 'INVENTORY'
          ? ['Confirm the stock limit before sharing the pre-order link.']
          : ['Review the collection amount and fee handling before sharing the link.'],
      },
      source: 'smart-fallback',
    };
  },

  async askOrganizerLedger(question: string): Promise<AiLedgerAnswer> {
    return apiRequest<AiLedgerAnswer>(
      '/api/ai/ask-ledger',
      { method: 'POST', body: JSON.stringify({ question }) },
      true
    );
  },

  async getCollectionAiInsights(collectionId: string): Promise<{ analysis: AiCollectionAnalysis; source: 'gemini' | 'smart-fallback' }> {
    return apiRequest<{ analysis: AiCollectionAnalysis; source: 'gemini' | 'smart-fallback' }>(
      `/api/ai/collections/${encodeURIComponent(collectionId)}/insights`,
      {},
      true
    );
  },

  async getAdminFraudRadar(): Promise<{ radar: AiFraudRadar; source: 'gemini' | 'smart-fallback' }> {
    return apiRequest<{ radar: AiFraudRadar; source: 'gemini' | 'smart-fallback' }>(
      '/api/ai/admin/fraud-radar',
      {},
      true
    );
  },

  async getAdminOverview(): Promise<AdminOverviewData> {
    return apiRequest<AdminOverviewData>('/api/admin/overview', {}, true);
  },

  async exportAdminTransactionsCsv(): Promise<void> {
    const csv = await apiRequest<string>(
      '/api/admin/transactions/export.csv',
      {},
      true
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wepay-platform-transactions.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  },

  // ---------------------------------------------------------------------------
  // COLLECTION MANAGEMENT (ORGANIZER)
  // ---------------------------------------------------------------------------
  async getCollections(): Promise<{ collections: Collection[] }> {
    const res = await apiRequest<{ collections: unknown[] }>('/api/collections', {}, true);
    const normalized = Array.isArray(res.collections)
      ? res.collections.map(normalizeCollection)
      : [];
    return { collections: normalized };
  },

  async getCollectionById(id: string): Promise<{ collection: Collection }> {
    const { collections } = await this.getCollections();
    const found = collections.find((c) => c._id === id);
    if (!found) {
      throw new Error('Collection not found.');
    }
    return { collection: found };
  },

  async generateAiCollectionDraft(prompt: string): Promise<{
    draft: Partial<CreateCollectionInput> & { engine?: string };
  }> {
    return apiRequest<{
      draft: Partial<CreateCollectionInput> & { engine?: string };
    }>(
      '/api/collections/ai-draft',
      {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      },
      true
    );
  },

  async createCollection(
    input: CreateCollectionInput
  ): Promise<{ collection: Collection }> {
    // Send both Joshua's field names and the Express schema aliases.
    const mode = input.type === 'POOL' ? 'SPLIT' : 'FLEXIBLE';
    const totalTarget =
      input.type === 'POOL'
        ? input.targetAmount
        : input.type === 'INVENTORY'
        ? input.amount * (input.stockLimit || 1)
        : input.amount;

    const res = await apiRequest<{ collection: unknown }>(
      '/api/collections',
      {
        method: 'POST',
        body: JSON.stringify({
          ...input,
          mode,
          totalTarget,
          perPersonAmount: input.amount,
          expectedPayers: [],
        }),
      },
      true
    );
    return { collection: normalizeCollection(res.collection) };
  },

  async updateCollectionStatus(
    id: string,
    status: CollectionStatus
  ): Promise<{ collection: Collection }> {
    const res = await apiRequest<{ collection: unknown }>(
      `/api/collections/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
      true
    );
    return { collection: normalizeCollection(res.collection) };
  },

  async getCollectionLedger(
    id: string
  ): Promise<{ collection: Collection; transactions: Transaction[] }> {
    const res = await apiRequest<{ collection: unknown; transactions: Transaction[] }>(
      `/api/collections/${id}/ledger`,
      {},
      true
    );
    return {
      collection: normalizeCollection(res.collection),
      transactions: Array.isArray(res.transactions)
        ? res.transactions.map(normalizeTransaction)
        : [],
    };
  },

  async getAllTransactions(): Promise<{ transactions: Transaction[] }> {
    const { collections } = await this.getCollections();
    const ledgers = await Promise.all(collections.map((c) => this.getCollectionLedger(c._id)));
    const all = ledgers
      .flatMap((ledger) => ledger.transactions)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { transactions: all };
  },

  // ---------------------------------------------------------------------------
  // PUBLIC COLLECTIONS (CONTRIBUTOR EXPERIENCE)
  // ---------------------------------------------------------------------------
  async getPublicCollection(slug: string): Promise<{ collection: Collection }> {
    const res = await apiRequest<{ collection: unknown }>(`/api/public/c/${slug}`);
    return { collection: normalizeCollection(res.collection) };
  },

  async getOrganizerPublicHub(
    handle: string
  ): Promise<{ organizer: Organizer; collections: Collection[] }> {
    const res = await apiRequest<{ organizer: unknown; collections: unknown[] }>(
      `/api/public/u/${handle}`
    );
    return {
      organizer: normalizeOrganizer(res.organizer),
      collections: Array.isArray(res.collections)
        ? res.collections.map(normalizeCollection)
        : [],
    };
  },

  // ---------------------------------------------------------------------------
  // PAYMENTS & DIGITAL RECEIPTS
  // ---------------------------------------------------------------------------
  async initializePayment(
    payload: PaymentInitializeRequest
  ): Promise<{ checkoutParams: InterswitchCheckoutParams; transaction: Transaction }> {
    const res = await apiRequest<{
      checkoutParams: InterswitchCheckoutParams;
      transaction: Transaction;
    }>('/api/payments/initialize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      ...res,
      transaction: normalizeTransaction(res.transaction),
    };
  },

  async verifyPaymentByReference(txnRef: string): Promise<{
    transaction: Transaction;
    interswitchResponse?: {
      ResponseCode?: string;
      ResponseDescription?: string;
    } | null;
    verificationError?: string;
  }> {
    const res = await apiRequest<{
      transaction: Transaction;
      interswitchResponse?: {
        ResponseCode?: string;
        ResponseDescription?: string;
      } | null;
      verificationError?: string;
    }>('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ txnRef }),
    });
    return {
      ...res,
      transaction: normalizeTransaction(res.transaction),
    };
  },

  async verifyPaymentAndGetReceipt(txnRef: string, receiptCode: string): Promise<ReceiptData> {
    await this.verifyPaymentByReference(txnRef);
    return this.getReceipt(receiptCode);
  },

  async getReceipt(receiptCode: string): Promise<ReceiptData> {
    const res = await apiRequest<ReceiptData>(`/api/payments/receipt/${receiptCode}`);
    return {
      ...res,
      transaction: normalizeTransaction(res.transaction),
    };
  },
};