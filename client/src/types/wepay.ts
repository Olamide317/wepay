export type CollectionType = 'POOL' | 'OPEN' | 'INVENTORY';

export type CollectionStatus = 'ACTIVE' | 'COMPLETED' | 'SOLD_OUT' | 'PAUSED' | 'CLOSED';

export type PricingRule = 'FIXED' | 'MINIMUM' | 'FLEXIBLE';

export type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export type CustomFieldType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox';

export interface SettlementBank {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

export interface Organizer {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  handle: string;
  avatarUrl?: string;
  avatarStorage?: 'none' | 'remote';
  avatarUpdatedAt?: string;
  settlementBank?: SettlementBank;
  verified?: boolean;
  isFounder?: boolean;
  role?: 'ORGANIZER' | 'SUPER_ADMIN';
  createdAt: string;
}

export interface CustomField {
  id: string;
  label: string;
  /** Supports dynamic builder types plus legacy 'text' alias for backwards compatibility */
  type: CustomFieldType | 'text';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  order?: number;
}

export interface CustomFieldAnswer {
  fieldId: string;
  label: string;
  type: CustomFieldType | 'text';
  value: string | string[];
}

export interface Collection {
  _id: string;
  organizerId: string;
  organizerName: string;
  organizerHandle: string;
  organizerVerified?: boolean;
  slug: string;
  type: CollectionType;
  title: string;
  description: string;
  currency: 'NGN';
  pricingRule: PricingRule;
  amount: number;
  targetAmount?: number;
  amountRaised: number;
  stockLimit?: number;
  stockSold?: number;
  maxQuantityPerOrder?: number;
  productImageUrl?: string;
  passFeeToPayer: boolean;
  customFields: CustomField[];
  status: CollectionStatus;
  expiresAt?: string;
  createdAt: string;
  contributorCount?: number;
}

export interface Transaction {
  _id: string;
  collectionId: string;
  collectionTitle?: string;
  collectionSlug?: string;
  collectionType?: CollectionType;
  txnRef: string;
  interswitchRef?: string;
  contributorName: string;
  contributorEmail: string;
  contributorPhone: string;
  quantity?: number;
  baseAmount: number;
  feeAmount: number;
  totalPaid: number;
  customResponses?: Record<string, string | string[]>;
  customFieldAnswers?: CustomFieldAnswer[];
  receiptCode: string;
  receiptHash?: string;
  status: TransactionStatus;
  paidAt?: string;
  createdAt: string;
}

export interface AdminPerson {
  fullName?: string;
  name?: string;
  email?: string;
}

export interface AdminTransaction extends Omit<Transaction, 'collectionId'> {
  payerName?: string;
  collectionId:
    | string
    | {
        title?: string;
        slug?: string;
        organizer?: AdminPerson | null;
      }
    | null;
}

export interface AdminCollection {
  _id: string;
  title: string;
  slug: string;
  type: CollectionType;
  status: CollectionStatus;
  totalCollected: number;
  contributorCount: number;
  createdAt: string;
  organizer?: AdminPerson | null;
}

export interface AdminOrganizer extends AdminPerson {
  _id: string;
  handle?: string;
  createdAt?: string;
  collectionCount: number;
  totalVolumeRaised: number;
}

export interface AdminOverviewData {
  kpis: {
    totalGrossVolume: number;
    totalFeeRevenue: number;
    totalOrganizers: number;
    activeCollections: number;
    totalTransactions: number;
    successfulTransactions: number;
    conversionRate: number;
  };
  recentTransactions: AdminTransaction[];
  collections: AdminCollection[];
  organizers: AdminOrganizer[];
}

export interface PaymentInitializeRequest {
  slug: string;
  contributorName: string;
  contributorEmail: string;
  contributorPhone: string;
  amount?: number;
  quantity?: number;
  customResponses?: Record<string, string | string[]>;
  customFieldAnswers?: CustomFieldAnswer[];
}

export interface InterswitchCheckoutParams {
  txnRef: string;
  amount: number;
  amountNaira: number;
  baseAmountNaira: number;
  feeAmountNaira: number;
  merchantCode: string;
  payItemId: string;
  mode: 'TEST' | 'LIVE';
  currency: '566' | 'NGN';
  receiptCode: string;
}

export interface ReceiptData {
  transaction: Transaction;
  collection: Pick<
    Collection,
    '_id' | 'slug' | 'title' | 'type' | 'organizerName' | 'organizerHandle' | 'passFeeToPayer'
  >;
}

export interface CreateCollectionInput {
  type: CollectionType;
  title: string;
  description: string;
  pricingRule: PricingRule;
  amount: number;
  targetAmount?: number;
  stockLimit?: number;
  maxQuantityPerOrder?: number;
  passFeeToPayer: boolean;
  customFields: CustomField[];
  expiresAt?: string;
}

export interface AiNavigatorAction {
  label: string;
  route: string;
  description: string;
}

export interface AiNavigatorResponse {
  reply: string;
  actions: AiNavigatorAction[];
  source: 'gemini' | 'smart-fallback';
}

export interface AiCollectionDraft {
  title?: string;
  description?: string;
  type?: CollectionType;
  mode?: 'SPLIT' | 'FLEXIBLE';
  pricingRule?: PricingRule;
  amount?: number;
  targetAmount?: number;
  stockLimit?: number;
  passFeeToPayer?: boolean;
  customFields?: CustomField[];
  auditTips?: string[];
  engine?: string;
}

export interface AiLedgerAnswer {
  answer: string;
  summaryMetric: string;
  matchedTransactionIds: string[];
  source: 'gemini' | 'smart-fallback';
}

export interface AiCollectionAnalysis {
  headline: string;
  insights: string[];
  whatsappBroadcast: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AiFraudFinding {
  title: string;
  detail: string;
  severity: 'INFO' | 'WARN' | 'ALERT';
}

export interface AiFraudRadar {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  headline: string;
  findings: AiFraudFinding[];
  recommendations: string[];
}
