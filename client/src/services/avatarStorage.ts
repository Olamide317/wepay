export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
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

  if (!hasValidExt || (mime && !hasValidMime)) {
    return {
      valid: false,
      error: 'Unsupported file format. Please choose a JPG, JPEG, PNG, or WEBP image.',
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
    return { valid: false, error: 'The selected image file is empty.' };
  }

  return { valid: true };
}
