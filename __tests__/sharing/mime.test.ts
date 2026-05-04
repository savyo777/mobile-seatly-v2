import { getFileExtensionForMime, getMediaTypeFromMime, getMimeType } from '@/lib/sharing/mime';

describe('social sharing mime helpers', () => {
  it('detects supported media MIME types from file URIs', () => {
    expect(getMimeType('file:///tmp/snap.jpg')).toBe('image/jpeg');
    expect(getMimeType('file:///tmp/snap.jpeg?cache=1')).toBe('image/jpeg');
    expect(getMimeType('file:///tmp/snap.png#preview')).toBe('image/png');
    expect(getMimeType('file:///tmp/snap.mp4')).toBe('video/mp4');
  });

  it('detects data URI MIME types', () => {
    expect(getMimeType('data:image/png;base64,aaaa')).toBe('image/png');
    expect(getMimeType('data:image/jpg;base64,aaaa')).toBe('image/jpeg');
    expect(getMimeType('data:video/mp4;base64,aaaa')).toBe('video/mp4');
  });

  it('maps MIME types to media kind and export extension', () => {
    expect(getMediaTypeFromMime('image/jpeg')).toBe('photo');
    expect(getMediaTypeFromMime('video/mp4')).toBe('video');
    expect(getFileExtensionForMime('image/png')).toBe('png');
    expect(getFileExtensionForMime('video/mp4')).toBe('mp4');
  });
});
