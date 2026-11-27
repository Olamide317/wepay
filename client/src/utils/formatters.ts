import { CustomFieldType, Transaction } from '../types/wepay';

export function formatNaira(amount: number, showDecimals = true): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(safeAmount);
}

export function formatDate(dateString?: string, includeTime = false): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';

  if (includeTime) {
    return new Intl.DateTimeFormat('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatFullHeaderDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getCollectionModeLabel(type: 'POOL' | 'OPEN' | 'INVENTORY'): string {
  switch (type) {
    case 'POOL':
      return 'Bill Split / Group Pool';
    case 'OPEN':
      return 'Open Collection / Dues';
    case 'INVENTORY':
      return 'Merchant Pre-Order';
  }
}

export function getShortModeLabel(type: 'POOL' | 'OPEN' | 'INVENTORY'): string {
  switch (type) {
    case 'POOL':
      return 'Group Pool';
    case 'OPEN':
      return 'Open / Dues';
    case 'INVENTORY':
      return 'Pre-Order';
  }
}

export function normalizeFieldType(type: CustomFieldType | 'text'): CustomFieldType {
  return type === 'text' ? 'short_text' : type;
}

export function getCustomFieldTypeLabel(type: CustomFieldType | 'text'): string {
  const normalized = normalizeFieldType(type);
  switch (normalized) {
    case 'short_text':
      return 'Short text';
    case 'long_text':
      return 'Long text';
    case 'email':
      return 'Email';
    case 'phone':
      return 'Phone number';
    case 'number':
      return 'Number';
    case 'select':
      return 'Dropdown';
    case 'radio':
      return 'Radio buttons';
    case 'checkbox':
      return 'Checkboxes';
  }
}

export function formatCustomAnswerValue(value: string | string[] | undefined): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export function formatDisplayName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function suggestEmailCorrection(email: string): string | undefined {
  const [localPart, domain, ...extra] = email.trim().split('@');
  if (!localPart || !domain || extra.length > 0) return undefined;

  const corrections: Record<string, string> = {
    'gmial.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'hotmal.com': 'hotmail.com',
  };
  const correctedDomain = corrections[domain.toLowerCase()];
  return correctedDomain ? `${localPart}@${correctedDomain}` : undefined;
}

export function isValidNigerianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s()-]/g, '');
  return /^(\+234|234|0)[789][01]\d{8}$/.test(cleaned);
}

export function isValidPhoneInput(phone: string): boolean {
  const cleaned = phone.replace(/[\s()-]/g, '');
  if (isValidNigerianPhone(cleaned)) return true;
  return /^\+?\d{10,15}$/.test(cleaned);
}

export function escapeCsvCell(value: string | number | undefined | null): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTransactionsToCsv(
  transactions: Transaction[],
  filenamePrefix = 'wepay-ledger'
): void {
  const headers = [
    'Contributor Name',
    'Email',
    'Phone',
    'Transaction Reference',
    'Interswitch Reference',
    'Receipt Code',
    'Quantity',
    'Amount Contributed (NGN)',
    'Processing Fee (NGN)',
    'Total Paid (NGN)',
    'Custom Field Responses',
    'Status',
    'Payment Date',
  ];

  const rows = transactions.map((tx) => {
    const customSummary = tx.customFieldAnswers?.length
      ? tx.customFieldAnswers
          .map((ans) => `${ans.label}: ${formatCustomAnswerValue(ans.value)}`)
          .join(' | ')
      : tx.customResponses
      ? Object.entries(tx.customResponses)
          .map(([k, v]) => `${k}: ${formatCustomAnswerValue(v)}`)
          .join(' | ')
      : '';

    return [
      escapeCsvCell(tx.contributorName),
      escapeCsvCell(tx.contributorEmail),
      escapeCsvCell(tx.contributorPhone),
      escapeCsvCell(tx.txnRef),
      escapeCsvCell(tx.interswitchRef || ''),
      escapeCsvCell(tx.receiptCode),
      escapeCsvCell(tx.quantity ?? 1),
      escapeCsvCell(tx.baseAmount.toFixed(2)),
      escapeCsvCell(tx.feeAmount.toFixed(2)),
      escapeCsvCell(tx.totalPaid.toFixed(2)),
      escapeCsvCell(customSummary),
      escapeCsvCell(tx.status),
      escapeCsvCell(tx.paidAt || tx.createdAt),
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
