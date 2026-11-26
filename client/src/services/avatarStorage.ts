export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
export const ALLOWED_AVATAR_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

export interface AvatarValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAvatarFile(file: File): AvatarValidationResult {
  if (!file) {
    return { valid: false, error: 'No image file was selected.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = (file.type || '').toLowerCase();

  const hasValidMime = mime ? ALLOWED_AVATAR_MIME_TYPES.has(mime) : false;
  const hasValidExt = ALLOWED_AVATAR_EXTENSIONS.has(ext);

  // Require a supported extension and, when MIME is provided by the browser, require a supported image MIME.
  if (!hasValidExt || (mime && !hasValidMime)) {
    return {
      valid: false,
      error:
        'Unsupported file format. Please choose a JPG, JPEG, PNG, or WEBP image.',
    };
  }

  if (file.size > MAX_AVATAR_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image is too large (${sizeMb} MB). Maximum allowed file size is 5 MB.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'The selected image file is empty.',
    };
  }

  return { valid: true };
}

const DB_NAME = 'wepay_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'organizer_avatars';

export interface StoredAvatarRecord {
  organizerId: string;
  blob: Blob;
  mimeType: string;
  fileName: string;
  updatedAt: string;
}

// Keep track of active object URLs per organizer so replacing/removing revokes old URLs cleanly.
const activeObjectUrls = new Map<string, string>();

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'organizerId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error('Unable to open browser media storage.'));
  });
}

export function revokeAvatarObjectUrl(organizerId: string): void {
  const existing = activeObjectUrls.get(organizerId);
  if (existing && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(existing);
    activeObjectUrls.delete(organizerId);
  }
}

export function createTrackedAvatarUrl(organizerId: string, blob: Blob): string {
  revokeAvatarObjectUrl(organizerId);
  const url = URL.createObjectURL(blob);
  activeObjectUrls.set(organizerId, url);
  return url;
}

export async function saveAvatarToIndexedDb(
  organizerId: string,
  blob: Blob,
  fileName: string
): Promise<StoredAvatarRecord> {
  const db = await openMediaDb();
  const record: StoredAvatarRecord = {
    organizerId,
    blob,
    mimeType: blob.type || 'image/png',
    fileName,
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () =>
      reject(req.error || new Error('Failed to save profile picture locally.'));
    tx.oncomplete = () => db.close();
  });
}

export async function getAvatarFromIndexedDb(
  organizerId: string
): Promise<StoredAvatarRecord | null> {
  if (!isIndexedDbAvailable()) return null;
  try {
    const db = await openMediaDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(organizerId);
      req.onsuccess = () => resolve((req.result as StoredAvatarRecord | undefined) || null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function deleteAvatarFromIndexedDb(organizerId: string): Promise<void> {
  revokeAvatarObjectUrl(organizerId);
  if (!isIndexedDbAvailable()) return;
  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(organizerId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    // Ignore storage cleanup errors
  }
}

export async function clearAllAvatarsFromIndexedDb(): Promise<void> {
  Array.from(activeObjectUrls.keys()).forEach((id) => revokeAvatarObjectUrl(id));
  if (!isIndexedDbAvailable()) return;
  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    // Ignore cleanup errors
  }
}
