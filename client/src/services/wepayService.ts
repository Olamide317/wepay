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
import { apiRequest, isBackendConfigured, setAuthToken } from './apiClient';
import { clearAllAvatarsFromIndexedDb } from './avatarStorage';
import {
  DEFAULT_ORGANIZER_AVATAR_URL,
  MOCK_COLLECTIONS,
  MOCK_ORGANIZER,
  MOCK_TRANSACTIONS,
} from './mockData';
import { profilePictureService } from './profilePictureService';

const STORE_KEY = 'wepay_sandbox_store_v1';

interface SandboxStore {
  organizer: Organizer;
  organizersByEmail?: Record<string, Organizer>;
  collections: Collection[];
  transactions: Transaction[];
  registeredEmail?: string;
}

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
    avatarStorage: raw?.avatarStorage || (raw?.avatarUrl ? 'remote' : 'none'),
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

function sanitizeOrganizerForStorage(org: Organizer): Organizer {
  if (org.avatarStorage === 'local_indexeddb') {
    const { avatarUrl: _omitBlobUrl, ...rest } = org;
    return rest;
  }
  return org;
}

const LEGACY_DEFAULT_AVATAR_URL = '/src/assets/images/organizer_avatar_1795712850216.jpg';

function sanitizeInheritedDemoFields(org: Organizer): { org: Organizer; changed: boolean } {
  let next = org;
  let changed = false;

  if (next.avatarUrl === LEGACY_DEFAULT_AVATAR_URL) {
    next = { ...next, avatarUrl: DEFAULT_ORGANIZER_AVATAR_URL };
    changed = true;
  }

  const isDemoAccount =
    next._id === MOCK_ORGANIZER._id ||
    next.email.toLowerCase() === MOCK_ORGANIZER.email.toLowerCase();

  if (
    !isDemoAccount &&
    next.settlementBank?.accountNumber === MOCK_ORGANIZER.settlementBank?.accountNumber &&
    next.settlementBank?.accountName === MOCK_ORGANIZER.settlementBank?.accountName
  ) {
    next = { ...next, settlementBank: undefined, verified: false };
    changed = true;
  }

  return { org: next, changed };
}

function loadSandboxStore(): SandboxStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SandboxStore;
      if (parsed && Array.isArray(parsed.collections) && Array.isArray(parsed.transactions)) {
        let migrated = false;
        if (parsed.organizer) {
          const res = sanitizeInheritedDemoFields(parsed.organizer);
          if (res.changed) {
            parsed.organizer = res.org;
            migrated = true;
          }
        }
        if (parsed.organizersByEmail) {
          Object.keys(parsed.organizersByEmail).forEach((key) => {
            const res = sanitizeInheritedDemoFields(parsed.organizersByEmail![key]);
            if (res.changed) {
              parsed.organizersByEmail![key] = res.org;
              migrated = true;
            }
          });
        }
        if (migrated) {
          saveSandboxStore(parsed);
        }
        return parsed;
      }
    }
  } catch {
    // Fall back to initial mock seed
  }
  const initialOrganizer = { ...MOCK_ORGANIZER };
  const initial: SandboxStore = {
    organizer: initialOrganizer,
    organizersByEmail: {
      [initialOrganizer.email.toLowerCase()]: initialOrganizer,
    },
    collections: MOCK_COLLECTIONS.map((c) => ({ ...c })),
    transactions: MOCK_TRANSACTIONS.map((t) => ({ ...t })),
  };
  saveSandboxStore(initial);
  return initial;
}

function saveSandboxStore(store: SandboxStore): void {
  try {
    const sanitizedOrganizer = sanitizeOrganizerForStorage(store.organizer);
    const sanitizedMap: Record<string, Organizer> = {
      ...(store.organizersByEmail || {}),
      [sanitizedOrganizer.email.toLowerCase()]: sanitizedOrganizer,
    };
    Object.keys(sanitizedMap).forEach((key) => {
      sanitizedMap[key] = sanitizeOrganizerForStorage(sanitizedMap[key]);
    });
    const toPersist: SandboxStore = {
      ...store,
      organizer: sanitizedOrganizer,
      organizersByEmail: sanitizedMap,
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(toPersist));
  } catch {
    // Ignore storage quota issues
  }
}

function delay(ms = 320): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function resetSandboxData(): void {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    // Ignore
  }
  void clearAllAvatarsFromIndexedDb();
}

export const wepayService = {
  isMockMode(): boolean {
    return !isBackendConfigured();
  },

  // ---------------------------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------------------------
  async login(payload: { email: string; password: string; remember?: boolean }): Promise<{
    organizer: Organizer;
    token: string;
    isMock: boolean;
  }> {
    if (isBackendConfigured()) {
      const res = await apiRequest<{ token: string; organizer?: unknown; user?: unknown }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email: payload.email, password: payload.password }),
        }
      );
      setAuthToken(res.token, payload.remember ?? true);
      const organizer = normalizeOrganizer(res.organizer || res.user);
      return { organizer, token: res.token, isMock: false };
    }

    await delay(450);
    if (!payload.email.trim() || payload.password.length < 6) {
      throw new Error('Invalid email or password. Password must be at least 6 characters.');
    }
    if (payload.email.trim().toLowerCase() === 'fail@wepay.ng') {
      throw new Error('Authentication failed: No organizer account found for this email.');
    }

    const store = loadSandboxStore();
    const normalizedEmail = payload.email.trim().toLowerCase();
    const existingAccount = store.organizersByEmail?.[normalizedEmail];

    if (existingAccount) {
      store.organizer = existingAccount;
      saveSandboxStore(store);
    } else if (normalizedEmail === MOCK_ORGANIZER.email.toLowerCase()) {
      store.organizer = { ...MOCK_ORGANIZER };
      saveSandboxStore(store);
    } else if (normalizedEmail !== store.organizer.email.toLowerCase()) {
      const localPart = payload.email.trim().split('@')[0] || 'Organizer';
      const derivedName = localPart
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (ch) => ch.toUpperCase());
      store.organizer = {
        _id: `org_${Date.now()}`,
        fullName: derivedName,
        email: payload.email.trim(),
        phone: '',
        handle: slugify(localPart) || `org-${Date.now().toString().slice(-4)}`,
        avatarUrl: undefined,
        avatarStorage: 'none',
        avatarUpdatedAt: undefined,
        settlementBank: undefined,
        verified: false,
        createdAt: new Date().toISOString(),
      };
      saveSandboxStore(store);
    }

    const hydrated = await profilePictureService.resolveOrganizerAvatar(store.organizer);
    const demoToken = 'sandbox_jwt_demo_token';
    setAuthToken(demoToken, payload.remember ?? true);
    return { organizer: hydrated, token: demoToken, isMock: true };
  },

  async register(payload: {
    fullName: string;
    email: string;
    phone: string;
    handle: string;
    password: string;
  }): Promise<{ organizer: Organizer; token: string; isMock: boolean }> {
    if (isBackendConfigured()) {
      const res = await apiRequest<{ token: string; organizer?: unknown; user?: unknown }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      setAuthToken(res.token, true);
      const organizer = normalizeOrganizer(res.organizer || res.user);
      return { organizer, token: res.token, isMock: false };
    }

    await delay(550);
    const store = loadSandboxStore();
    const newOrganizer: Organizer = {
      _id: `org_${Date.now()}`,
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      handle: slugify(payload.handle) || 'organizer',
      avatarUrl: undefined,
      avatarStorage: 'none',
      avatarUpdatedAt: undefined,
      settlementBank: undefined,
      verified: false,
      createdAt: new Date().toISOString(),
    };
    store.organizer = newOrganizer;
    saveSandboxStore(store);

    const demoToken = 'sandbox_jwt_demo_token';
    setAuthToken(demoToken, true);
    return { organizer: newOrganizer, token: demoToken, isMock: true };
  },

  async updateSettlementBank(bank: SettlementBank): Promise<{ organizer: Organizer; isMock: boolean }> {
    if (isBackendConfigured()) {
      const res = await apiRequest<{ organizer?: unknown; user?: unknown }>(
        '/api/profile/bank',
        {
          method: 'POST',
          body: JSON.stringify(bank),
        },
        true
      );
      return { organizer: normalizeOrganizer(res.organizer || res.user), isMock: false };
    }

    await delay(400);
    const store = loadSandboxStore();
    store.organizer = {
      ...store.organizer,
      settlementBank: bank,
    };
    saveSandboxStore(store);
    const hydrated = await profilePictureService.resolveOrganizerAvatar(store.organizer);
    return { organizer: hydrated, isMock: true };
  },

  async updateOrganizerName(fullName: string): Promise<{ organizer: Organizer; isMock: boolean }> {
    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      throw new Error('Full name must be at least 2 characters.');
    }

    if (isBackendConfigured()) {
      throw new Error(
        'Server-side profile name update endpoint is not yet enabled on the configured backend.'
      );
    }

    await delay(300);
    const store = loadSandboxStore();
    store.organizer = {
      ...store.organizer,
      fullName: trimmed,
    };
    store.collections = store.collections.map((col) =>
      col.organizerId === store.organizer._id ? { ...col, organizerName: trimmed } : col
    );
    saveSandboxStore(store);
    const hydrated = await profilePictureService.resolveOrganizerAvatar(store.organizer);
    return { organizer: hydrated, isMock: true };
  },

  async updateProfilePicture(
    imageBlob: Blob,
    fileName: string
  ): Promise<{ organizer: Organizer; isMock: boolean }> {
    const store = loadSandboxStore();
    const uploadResult = await profilePictureService.uploadProfilePicture(
      store.organizer._id,
      imageBlob,
      fileName
    );

    const updatedOrganizer: Organizer = {
      ...store.organizer,
      avatarUrl: uploadResult.avatarUrl,
      avatarStorage: uploadResult.avatarStorage,
      avatarUpdatedAt: uploadResult.updatedAt,
    };

    store.organizer = updatedOrganizer;
    saveSandboxStore(store);
    return { organizer: updatedOrganizer, isMock: uploadResult.avatarStorage === 'local_indexeddb' };
  },

  async removeProfilePicture(): Promise<{ organizer: Organizer; isMock: boolean }> {
    const store = loadSandboxStore();
    await profilePictureService.removeProfilePicture(store.organizer._id);

    const updatedOrganizer: Organizer = {
      ...store.organizer,
      avatarUrl: undefined,
      avatarStorage: 'none',
      avatarUpdatedAt: new Date().toISOString(),
    };

    store.organizer = updatedOrganizer;
    saveSandboxStore(store);
    return { organizer: updatedOrganizer, isMock: !isBackendConfigured() };
  },

  async getCurrentOrganizer(): Promise<Organizer> {
    if (isBackendConfigured()) {
      const res = await apiRequest<{ organizer?: unknown; user?: unknown }>(
        '/api/auth/me',
        {},
        true
      );
      return normalizeOrganizer(res.organizer || res.user);
    }

    const store = loadSandboxStore();
    return profilePictureService.resolveOrganizerAvatar(store.organizer);
  },

  // ---------------------------------------------------------------------------
  // COLLECTION MANAGEMENT (ORGANIZER)
  // ---------------------------------------------------------------------------
  async getCollections(): Promise<{ collections: Collection[]; isMock: boolean }> {
    if (isBackendConfigured()) {
      const res = await apiRequest<{ collections: unknown[] }>('/api/collections', {}, true);
      const normalized = Array.isArray(res.collections)
        ? res.collections.map(normalizeCollection)
        : [];
      return { collections: normalized, isMock: false };
    }

    await delay(280);
    const store = loadSandboxStore();
    const enriched = store.collections.map((col) => {
      const successTxs = store.transactions.filter(
        (t) => t.collectionId === col._id && t.status === 'SUCCESS'
      );
      return {
        ...col,
        contributorCount: Math.max(col.contributorCount ?? 0, successTxs.length),
      };
    });
    return { collections: enriched, isMock: true };
  },

  async getCollectionById(id: string): Promise<{ collection: Collection; isMock: boolean }> {
    const { collections, isMock } = await this.getCollections();
    const found = collections.find((c) => c._id === id);
    if (!found) {
      throw new Error('Collection not found.');
    }
    return { collection: found, isMock };
  },

  async generateAiCollectionDraft(prompt: string): Promise<{
    draft: Partial<CreateCollectionInput> & { engine?: string };
  }> {
    if (isBackendConfigured()) {
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
    }

    await delay(350);
    return {
      draft: {
        type: 'POOL',
        title: prompt.slice(0, 60),
        description: `Group collection for ${prompt}.`,
        pricingRule: 'FIXED',
        amount: 5000,
        targetAmount: 25000,
        passFeeToPayer: true,
        customFields: [],
        engine: 'Local Sandbox AI',
      },
    };
  },

  async createCollection(
    input: CreateCollectionInput
  ): Promise<{ collection: Collection; isMock: boolean }> {
    if (isBackendConfigured()) {
      // Send both Joshua's field names and your Express schema aliases
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
      return { collection: normalizeCollection(res.collection), isMock: false };
    }

    await delay(500);
    const store = loadSandboxStore();
    const baseSlug = slugify(input.title) || 'collection';
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const slug = `${baseSlug}-${randomSuffix}`;

    const newCollection: Collection = {
      _id: `col_${Date.now()}`,
      organizerId: store.organizer._id,
      organizerName: store.organizer.fullName,
      organizerHandle: store.organizer.handle,
      organizerVerified: store.organizer.verified,
      slug,
      type: input.type,
      title: input.title.trim(),
      description: input.description.trim(),
      currency: 'NGN',
      pricingRule: input.pricingRule,
      amount: input.amount,
      targetAmount: input.type === 'POOL' ? input.targetAmount : undefined,
      amountRaised: 0,
      stockLimit: input.type === 'INVENTORY' ? input.stockLimit : undefined,
      stockSold: input.type === 'INVENTORY' ? 0 : undefined,
      maxQuantityPerOrder: input.type === 'INVENTORY' ? input.maxQuantityPerOrder || 5 : undefined,
      passFeeToPayer: input.passFeeToPayer,
      customFields: input.customFields,
      status: 'ACTIVE',
      expiresAt: input.expiresAt || undefined,
      createdAt: new Date().toISOString(),
      contributorCount: 0,
    };

    store.collections = [newCollection, ...store.collections];
    saveSandboxStore(store);
    return { collection: newCollection, isMock: true };
  },

  async updateCollectionStatus(
    id: string,
    status: CollectionStatus
  ): Promise<{ collection: Collection; isMock: boolean }> {
    if (isBackendConfigured()) {
      const res = await apiRequest<{ collection: unknown }>(
        `/api/collections/${id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
        true
      );
      return { collection: normalizeCollection(res.collection), isMock: false };
    }

    await delay(300);
    const store = loadSandboxStore();
    const idx = store.collections.findIndex((c) => c._id === id);
    if (idx === -1) throw new Error('Collection not found.');
    store.collections[idx] = { ...store.collections[idx], status };
    saveSandboxStore(store);
    return { collection: store.collections[idx], isMock: true };
  },

  async getCollectionLedger(
    id: string
  ): Promise<{ collection: Collection; transactions: Transaction[]; isMock: boolean }> {
    if (isBackendConfigured()) {
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
        isMock: false,
      };
    }

    await delay(320);
    const store = loadSandboxStore();
    const collection = store.collections.find((c) => c._id === id);
    if (!collection) throw new Error('Collection not found.');

    const transactions = store.transactions
      .filter((t) => t.collectionId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { collection, transactions, isMock: true };
  },

  async getAllTransactions(): Promise<{ transactions: Transaction[]; isMock: boolean }> {
    if (isBackendConfigured()) {
      const { collections } = await this.getCollections();
      const ledgers = await Promise.all(collections.map((c) => this.getCollectionLedger(c._id)));
      const all = ledgers
        .flatMap((l) => l.transactions)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { transactions: all, isMock: false };
    }

    await delay(280);
    const store = loadSandboxStore();
    const sorted = [...store.transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return { transactions: sorted, isMock: true };
  },

  // ---------------------------------------------------------------------------
  // PUBLIC COLLECTIONS (CONTRIBUTOR EXPERIENCE)
  // ---------------------------------------------------------------------------
  async getPublicCollection(slug: string): Promise<{ collection: Collection; isMock: boolean }> {
    if (isBackendConfigured()) {
      const res = await apiRequest<{ collection: unknown }>(`/api/public/c/${slug}`);
      return { collection: normalizeCollection(res.collection), isMock: false };
    }

    await delay(300);
    const store = loadSandboxStore();
    const collection = store.collections.find((c) => c.slug === slug);
    if (!collection) {
      throw new Error('This collection link is invalid or does not exist.');
    }
    return { collection, isMock: true };
  },

  async getOrganizerPublicHub(
    handle: string
  ): Promise<{ organizer: Organizer; collections: Collection[]; isMock: boolean }> {
    if (isBackendConfigured()) {
      const res = await apiRequest<{ organizer: unknown; collections: unknown[] }>(
        `/api/public/u/${handle}`
      );
      return {
        organizer: normalizeOrganizer(res.organizer),
        collections: Array.isArray(res.collections)
          ? res.collections.map(normalizeCollection)
          : [],
        isMock: false,
      };
    }

    await delay(300);
    const store = loadSandboxStore();
    if (store.organizer.handle.toLowerCase() !== handle.toLowerCase()) {
      throw new Error('Organizer handle not found.');
    }
    const activeCollections = store.collections.filter((c) => c.status !== 'CLOSED');
    const hydratedOrganizer = await profilePictureService.resolveOrganizerAvatar(store.organizer);
    return { organizer: hydratedOrganizer, collections: activeCollections, isMock: true };
  },

  // ---------------------------------------------------------------------------
  // PAYMENTS & DIGITAL RECEIPTS
  // ---------------------------------------------------------------------------
  async initializePayment(
    payload: PaymentInitializeRequest
  ): Promise<{ checkoutParams: InterswitchCheckoutParams; transaction: Transaction; isMock: boolean }> {
    if (isBackendConfigured()) {
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
        isMock: false,
      };
    }

    await delay(500);
    const store = loadSandboxStore();
    const colIndex = store.collections.findIndex((c) => c.slug === payload.slug);
    if (colIndex === -1) {
      throw new Error('Collection not found.');
    }
    const col = store.collections[colIndex];

    if (col.status !== 'ACTIVE') {
      throw new Error(`This collection is currently ${col.status.toLowerCase()} and cannot accept payments.`);
    }

    const qty = col.type === 'INVENTORY' ? Math.max(1, payload.quantity || 1) : 1;
    if (col.type === 'INVENTORY') {
      const remaining = (col.stockLimit ?? 0) - (col.stockSold ?? 0);
      if (remaining < qty) {
        throw new Error(`Only ${remaining} unit(s) remaining in stock.`);
      }
    }

    const baseAmount =
      col.type === 'INVENTORY'
        ? col.amount * qty
        : col.pricingRule === 'FIXED'
        ? col.amount
        : Math.max(payload.amount || col.amount, 100);

    if (col.type === 'POOL' && col.targetAmount) {
      const remainingTarget = Math.max(0, col.targetAmount - col.amountRaised);
      if (remainingTarget <= 0) {
        throw new Error('This pool target has already been reached.');
      }
      if (baseAmount > remainingTarget) {
        throw new Error(
          `Contribution exceeds remaining pool balance of Ã¢â€šÂ¦${remainingTarget.toLocaleString('en-NG')}.`
        );
      }
    }

    const sandboxFee = col.passFeeToPayer ? Math.min(Math.round(baseAmount * 0.015) + 50, 2000) : 0;
    const totalPaid = baseAmount + sandboxFee;

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const txnRef = `WP-SBX-${Date.now().toString().slice(-6)}-${randomNum}`;
    const receiptCode = `RCP-SBX-${randomNum}`;

    const pendingTx: Transaction = {
      _id: `tx_${Date.now()}`,
      collectionId: col._id,
      collectionTitle: col.title,
      collectionSlug: col.slug,
      collectionType: col.type,
      txnRef,
      contributorName: payload.contributorName.trim(),
      contributorEmail: payload.contributorEmail.trim(),
      contributorPhone: payload.contributorPhone.trim(),
      quantity: col.type === 'INVENTORY' ? qty : 1,
      baseAmount,
      feeAmount: sandboxFee,
      totalPaid,
      customResponses: payload.customResponses,
      customFieldAnswers: payload.customFieldAnswers,
      receiptCode,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      isSimulated: true,
    };

    store.transactions = [pendingTx, ...store.transactions];
    saveSandboxStore(store);

    const checkoutParams: InterswitchCheckoutParams = {
      txnRef,
      amount: totalPaid * 100,
      amountNaira: totalPaid,
      baseAmountNaira: baseAmount,
      feeAmountNaira: sandboxFee,
      merchantCode: 'SANDBOX_MERCHANT',
      payItemId: 'SANDBOX_PAY_ITEM',
      mode: 'TEST',
      currency: '566',
      receiptCode,
      isSandboxSimulation: true,
    };

    return { checkoutParams, transaction: pendingTx, isMock: true };
  },

  async verifyPaymentByReference(txnRef: string): Promise<{
    transaction: Transaction;
    interswitchResponse?: {
      ResponseCode?: string;
      ResponseDescription?: string;
    } | null;
    verificationError?: string;
  }> {
    if (!isBackendConfigured()) {
      throw new Error('Hosted checkout verification requires the WePay backend.');
    }

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

  async simulateSandboxVerification(
    receiptCode: string,
    outcome: 'SUCCESS' | 'FAILED' | 'PENDING'
  ): Promise<ReceiptData> {
    if (isBackendConfigured()) {
      const existing = await this.getReceipt(receiptCode);
      if (outcome !== 'PENDING') {
        await apiRequest('/api/payments/verify', {
          method: 'POST',
          body: JSON.stringify({
            txnRef: existing.transaction.txnRef,
          }),
        });
      }
      return this.getReceipt(receiptCode);
    }

    await delay(850);
    const store = loadSandboxStore();
    const txIdx = store.transactions.findIndex((t) => t.receiptCode === receiptCode);
    if (txIdx === -1) {
      throw new Error('Transaction record not found.');
    }

    const tx = store.transactions[txIdx];
    const wasAlreadySuccess = tx.status === 'SUCCESS';

    const updatedTx: Transaction = {
      ...tx,
      status: outcome,
      interswitchRef:
        outcome === 'SUCCESS'
          ? `ISW-SBX-${Math.floor(10000000 + Math.random() * 89999999)}`
          : undefined,
      receiptHash:
        outcome === 'SUCCESS'
          ? `sandbox_hash_${Math.random().toString(36).slice(2, 14)}`
          : undefined,
      paidAt: outcome === 'SUCCESS' ? new Date().toISOString() : undefined,
      isSimulated: true,
    };

    store.transactions[txIdx] = updatedTx;

    const colIdx = store.collections.findIndex((c) => c._id === tx.collectionId);
    if (colIdx !== -1 && outcome === 'SUCCESS' && !wasAlreadySuccess) {
      const col = store.collections[colIdx];
      const nextRaised = col.amountRaised + tx.baseAmount;
      const nextSold =
        col.type === 'INVENTORY' ? (col.stockSold ?? 0) + (tx.quantity ?? 1) : col.stockSold;

      let nextStatus = col.status;
      if (col.type === 'POOL' && col.targetAmount && nextRaised >= col.targetAmount) {
        nextStatus = 'COMPLETED';
      }
      if (col.type === 'INVENTORY' && col.stockLimit && (nextSold ?? 0) >= col.stockLimit) {
        nextStatus = 'COMPLETED';
      }

      store.collections[colIdx] = {
        ...col,
        amountRaised: nextRaised,
        stockSold: nextSold,
        status: nextStatus,
        contributorCount: (col.contributorCount ?? 0) + 1,
      };
    }

    saveSandboxStore(store);

    const col = store.collections[colIdx];
    return {
      transaction: updatedTx,
      collection: {
        _id: col._id,
        slug: col.slug,
        title: col.title,
        type: col.type,
        organizerName: col.organizerName,
        organizerHandle: col.organizerHandle,
        passFeeToPayer: col.passFeeToPayer,
      },
      isSimulated: true,
    };
  },

  async verifyPaymentAndGetReceipt(txnRef: string, receiptCode: string): Promise<ReceiptData> {
    await this.verifyPaymentByReference(txnRef);
    return this.getReceipt(receiptCode);
  },

  async getReceipt(receiptCode: string): Promise<ReceiptData> {
    if (isBackendConfigured()) {
      const res = await apiRequest<ReceiptData>(`/api/payments/receipt/${receiptCode}`);
      return {
        ...res,
        transaction: normalizeTransaction(res.transaction),
        isSimulated: false,
      };
    }

    await delay(300);
    const store = loadSandboxStore();
    const tx = store.transactions.find(
      (t) => t.receiptCode.toLowerCase() === receiptCode.toLowerCase()
    );
    if (!tx) {
      throw new Error('Receipt code not found or invalid.');
    }
    const col = store.collections.find((c) => c._id === tx.collectionId);
    return {
      transaction: tx,
      collection: col
        ? {
            _id: col._id,
            slug: col.slug,
            title: col.title,
            type: col.type,
            organizerName: col.organizerName,
            organizerHandle: col.organizerHandle,
            passFeeToPayer: col.passFeeToPayer,
          }
        : {
            _id: tx.collectionId,
            slug: tx.collectionSlug || '',
            title: tx.collectionTitle || 'WePay Collection',
            type: tx.collectionType || 'OPEN',
            organizerName: store.organizer.fullName,
            organizerHandle: store.organizer.handle,
            passFeeToPayer: true,
          },
      isSimulated: true,
    };
  },
};