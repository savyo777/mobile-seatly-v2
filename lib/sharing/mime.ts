export type SocialMediaType = 'photo' | 'video';

export type SocialMimeType = 'image/jpeg' | 'image/png' | 'video/mp4';

const MIME_FROM_EXTENSION: Record<string, SocialMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
};

function stripUriDecoration(uri: string): string {
  return uri.split('?')[0]?.split('#')[0] ?? uri;
}

export function getMimeType(mediaUri: string): SocialMimeType {
  const dataUriMatch = mediaUri.match(/^data:([^;,]+)/i);
  if (dataUriMatch) {
    const mime = dataUriMatch[1]?.toLowerCase();
    if (mime === 'image/jpg') return 'image/jpeg';
    if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'video/mp4') return mime;
  }

  const cleanUri = stripUriDecoration(mediaUri).toLowerCase();
  const extension = cleanUri.match(/\.([a-z0-9]+)$/)?.[1];

  if (extension && MIME_FROM_EXTENSION[extension]) {
    return MIME_FROM_EXTENSION[extension];
  }

  return 'image/jpeg';
}

export function getMediaTypeFromMime(mimeType: string): SocialMediaType {
  return mimeType.startsWith('video/') ? 'video' : 'photo';
}

export function getFileExtensionForMime(mimeType: string): 'jpg' | 'png' | 'mp4' {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'video/mp4') return 'mp4';
  return 'jpg';
}

export function getWildcardMimeType(mimeType: string): 'image/*' | 'video/*' {
  return mimeType.startsWith('video/') ? 'video/*' : 'image/*';
}
