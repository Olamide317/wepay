import { Organizer } from '../types/wepay';
import { isBackendConfigured } from './apiClient';
import {
  createTrackedAvatarUrl,
  deleteAvatarFromIndexedDb,
  getAvatarFromIndexedDb,
  MAX_AVATAR_BYTES,
  revokeAvatarObjectUrl,
  saveAvatarToIndexedDb,
} from './avatarStorage';

export interface ProfilePictureUploadResult {
  avatarUrl: string;
  avatarStorage: 'local_indexeddb' | 'remote';
  updatedAt: string;
}

/**
 * Prepares a standard multipart/form-data payload so this service can be
 * connected directly to a backend upload endpoint once one is provisioned.
 */
export function buildProfilePictureFormData(
  imageBlob: Blob,
  fileName = 'profile-picture.png'
): FormData {
  const formData = new FormData();
  formData.append('avatar', imageBlob, fileName);
  return formData;
}

/**
 * Adapter boundary for profile picture upload/removal.
 * - In Prototype Sandbox Mode (no backend configured), images are persisted as
 *   Blobs in IndexedDB keyed by organizer._id so large binaries never bloat localStorage.
 * - When a backend API is configured, connect the multipart/form-data endpoint here
 *   once confirmed by the backend contract.
 */
export const profilePictureService = {
  async uploadProfilePicture(
    organizerId: string,
    croppedBlob: Blob,
    fileName: string
  ): Promise<ProfilePictureUploadResult> {
    if (croppedBlob.size > MAX_AVATAR_BYTES) {
      throw new Error('Processed image exceeds the 5 MB upload limit.');
    }

    if (isBackendConfigured()) {
      // Backend contract currently documents /api/profile/bank only; do not invent unconfirmed endpoints.
      throw new Error(
        'Server-side profile picture upload endpoint is not yet enabled on the configured backend.'
      );
    }

    // Prepare multipart/form-data shape ahead of backend integration
    buildProfilePictureFormData(croppedBlob, fileName);

    const record = await saveAvatarToIndexedDb(organizerId, croppedBlob, fileName);
    const objectUrl = createTrackedAvatarUrl(organizerId, record.blob);

    return {
      avatarUrl: objectUrl,
      avatarStorage: 'local_indexeddb',
      updatedAt: record.updatedAt,
    };
  },

  async removeProfilePicture(organizerId: string): Promise<void> {
    if (isBackendConfigured()) {
      throw new Error(
        'Server-side profile picture removal endpoint is not yet enabled on the configured backend.'
      );
    }

    await deleteAvatarFromIndexedDb(organizerId);
  },

  async resolveOrganizerAvatar(organizer: Organizer): Promise<Organizer> {
    if (organizer.avatarStorage === 'none') {
      revokeAvatarObjectUrl(organizer._id);
      return {
        ...organizer,
        avatarUrl: undefined,
      };
    }

    if (organizer.avatarStorage === 'local_indexeddb') {
      const record = await getAvatarFromIndexedDb(organizer._id);
      if (record) {
        const objectUrl = createTrackedAvatarUrl(organizer._id, record.blob);
        return {
          ...organizer,
          avatarUrl: objectUrl,
          avatarUpdatedAt: record.updatedAt,
        };
      }
      return {
        ...organizer,
        avatarUrl: undefined,
        avatarStorage: 'none',
      };
    }

    // If no explicit storage flag yet, check if IndexedDB already has an uploaded picture for this organizer
    const record = await getAvatarFromIndexedDb(organizer._id);
    if (record) {
      const objectUrl = createTrackedAvatarUrl(organizer._id, record.blob);
      return {
        ...organizer,
        avatarUrl: objectUrl,
        avatarStorage: 'local_indexeddb',
        avatarUpdatedAt: record.updatedAt,
      };
    }

    return organizer;
  },
};
