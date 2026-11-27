/**
 * WePay Backend REST API Client
 */

const DEFAULT_API_BASE_URL = 'https://wepay-slkv.onrender.com';
const RAW_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
const API_BASE_URL = RAW_BASE_URL.endsWith('/api') ? RAW_BASE_URL.slice(0, -4) : RAW_BASE_URL;
const TOKEN_KEY = 'wepay_auth_token';
const USE_MOCK = import.meta.env?.VITE_USE_MOCK === 'true';

function shouldUseSameOriginProxy(): boolean {
  if (import.meta.env?.DEV) return true;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.run.app');
}

export function getApiBaseUrl(): string {
  return shouldUseSameOriginProxy() ? '' : API_BASE_URL;
}

export function isBackendConfigured(): boolean {
  return Boolean(API_BASE_URL) && !USE_MOCK;
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

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${normalizedPath}`, {
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