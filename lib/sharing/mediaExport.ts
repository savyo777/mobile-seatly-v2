import * as FileSystem from 'expo-file-system/legacy';
import {
  getFileExtensionForMime,
  getMediaTypeFromMime,
  getMimeType,
  type SocialMediaType,
} from './mime';

const SHARE_DIRECTORY = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}cenaiva-social-share/`;

type ExportOptions = {
  sourceUri: string;
  fallbackMimeType: 'image/jpeg' | 'video/mp4';
};

function normalizeLocalFileUri(uri: string): string {
  return uri.startsWith('/') ? `file://${uri}` : uri;
}

function buildOutputUri(mimeType: string): string {
  const extension = getFileExtensionForMime(mimeType);
  const nonce = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  return `${SHARE_DIRECTORY}cenaiva-filtered-${nonce}.${extension}`;
}

function resolveExportMimeType(sourceUri: string, fallbackMimeType: 'image/jpeg' | 'video/mp4') {
  if (fallbackMimeType === 'video/mp4') {
    return 'video/mp4';
  }

  return getMimeType(sourceUri) === 'image/png' ? 'image/png' : 'image/jpeg';
}

async function ensureShareDirectory(): Promise<void> {
  if (!SHARE_DIRECTORY) {
    throw new Error('The device file cache is not available for sharing.');
  }

  await FileSystem.makeDirectoryAsync(SHARE_DIRECTORY, { intermediates: true });
}

async function exportDataUri(sourceUri: string, destinationUri: string): Promise<string> {
  const match = sourceUri.match(/^data:([^;,]+);base64,(.+)$/i);
  if (!match) {
    throw new Error('Unsupported data URI. Expected base64 encoded photo or video data.');
  }

  await FileSystem.writeAsStringAsync(destinationUri, match[2] ?? '', {
    encoding: FileSystem.EncodingType.Base64,
  });
  return destinationUri;
}

async function exportMedia({ sourceUri, fallbackMimeType }: ExportOptions): Promise<string> {
  if (!sourceUri) {
    throw new Error('No filtered media file was provided for sharing.');
  }

  await ensureShareDirectory();

  const mimeType = resolveExportMimeType(sourceUri, fallbackMimeType);
  const destinationUri = buildOutputUri(mimeType);
  const normalizedSourceUri = normalizeLocalFileUri(sourceUri);

  if (normalizedSourceUri.startsWith('data:')) {
    return exportDataUri(normalizedSourceUri, destinationUri);
  }

  if (normalizedSourceUri.startsWith('http://') || normalizedSourceUri.startsWith('https://')) {
    const { uri } = await FileSystem.downloadAsync(normalizedSourceUri, destinationUri);
    return uri;
  }

  await FileSystem.copyAsync({
    from: normalizedSourceUri,
    to: destinationUri,
  });

  return destinationUri;
}

export async function exportFilteredPhoto(sourceUri: string): Promise<string> {
  return exportMedia({ sourceUri, fallbackMimeType: 'image/jpeg' });
}

export async function exportFilteredVideo(sourceUri: string): Promise<string> {
  return exportMedia({ sourceUri, fallbackMimeType: 'video/mp4' });
}

export async function exportFilteredMedia(sourceUri: string, mediaType?: SocialMediaType): Promise<string> {
  if (mediaType === 'video' || getMediaTypeFromMime(getMimeType(sourceUri)) === 'video') {
    return exportFilteredVideo(sourceUri);
  }

  return exportFilteredPhoto(sourceUri);
}

export { getMimeType };
