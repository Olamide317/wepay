import {
  Collection,
  CollectionStatus,
  CreateCollectionInput,
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