import { Organizer } from '../types/wepay';
import { MAX_AVATAR_BYTES } from './avatarStorage';

export interface ProfilePictureUploadResult {
  avatarUrl: string;
  avatarStorage: 'remote';
  updatedAt: string;
}

export function buildProfilePictureFormData(
  imageBlob: Blob,
  fileName = 'profile-picture.png'
): FormData {
  const formData = new FormData();
  formData.append('avatar', imageBlob, fileName);
  return formData;
}

export const profilePictureService = {
  async uploadProfilePicture(
    _organizerId: string,
    croppedBlob: Blob,
    _fileName: string
  ): Promise<ProfilePictureUploadResult> {
    if (croppedBlob.size > MAX_AVATAR_BYTES) {
      throw new Error('Processed image exceeds the 5 MB upload limit.');
    }

    throw new Error(
      'Server-side profile picture upload endpoint is not yet enabled on the configured backend.'
    );
  },

  async removeProfilePicture(_organizerId: string): Promise<void> {
    throw new Error(
      'Server-side profile picture removal endpoint is not yet enabled on the configured backend.'
    );
  },

  async resolveOrganizerAvatar(organizer: Organizer): Promise<Organizer> {
    return organizer;
  },
};
