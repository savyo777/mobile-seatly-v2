import * as Sharing from 'expo-sharing';

export function buildShareCaption(restaurantName: string, rating?: number): string {
  const stars = rating ? '⭐'.repeat(rating) : '';
  const starLine = stars ? ` ${stars}` : '';
  return `Just dined at ${restaurantName}${starLine} — booked and discovered through @SeatlyApp 🍽️ Download the app: seatly.app`;
}

export async function shareSnapToSocial(
  imageUrl: string,
  restaurantName: string,
  rating?: number,
): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    return;
  }

  const caption = buildShareCaption(restaurantName, rating);

  // For remote URLs we share the URL + caption text via the native share sheet.
  // When we have a local file URI (post-camera), we share the file directly.
  const isLocalFile = imageUrl.startsWith('file://') || imageUrl.startsWith('/');
  if (isLocalFile) {
    await Sharing.shareAsync(imageUrl, {
      dialogTitle: caption,
      mimeType: 'image/jpeg',
    });
  } else {
    // Fallback: share as text with the URL so the user can paste into Instagram/TikTok
    await Sharing.shareAsync(imageUrl, {
      dialogTitle: caption,
    });
  }
}
