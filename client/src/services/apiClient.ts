/**
 * WePay Backend REST API Client
 *
 * Documented Backend Endpoints:
 * - POST /api/auth/register
 * - POST /api/auth/login
 * - POST /api/profile/bank
 * - POST /api/collections
 * - GET  /api/collections
 * - GET  /api/collections/:id/ledger
 * - PATCH /api/collections/:id/status
 * - GET  /api/public/c/:slug
 * - GET  /api/public/u/:handle
 * - POST /api/payments/initialize
 * - GET  /api/payments/receipt/:receiptCode
 *
 * NOTE: POST /api/payments/webhook is a server-to-server Interswitch webhook
 * and MUST NEVER be called from the browser.
 *
 * Contract Assumptions (pending final backend confirmation):
 * 1. Auth endpoints return `{ token, organizer }` (or `{ data: { token, user } }`).
 * 2. Protected organizer routes accept `Authorization: Bearer <token>`.
 * 3. `POST /api/payments/initialize` returns `{ txnRef, amount, merchantCode, payItemId, feeAmount, totalPaid, receiptCode }`.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const TOKEN_KEY = 'wepay_auth_token';

export function isBackendConfigured(): boolean {
  const useMock = import.meta.env?.VITE_USE_MOCK;
  return Boolean(API_BASE_URL) && useMock !== 'true';
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null, remember = true): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    if (!token) return;
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  } catch {
    // Storage unavailable
  }
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = false
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError('Backend API base URL is not configured.', 503);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const msg =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: unknown }).message)
        : `Request failed with status ${response.status}`;
    throw new ApiError(msg, response.status, parsed);
  }

  return parsed as T;
}
