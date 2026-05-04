# Cenaiva Social Sharing

This feature replaces homepage deep links with media-bearing share flows. The app exports filtered media into a local cache file first, then platform buttons open a platform composer/post entry point with that file attached.

## Implemented

- `exportFilteredPhoto(sourceUri)` copies or downloads final filtered photos to a local JPEG/PNG file.
- `exportFilteredVideo(sourceUri)` copies or downloads final filtered videos to a local MP4 file.
- `getMimeType(mediaUri)` resolves `image/jpeg`, `image/png`, or `video/mp4`.
- `openSystemShareSheet(mediaUri, mediaType, optionalMessage)` remains available for non-platform fallback flows, but platform buttons do not silently open it.
- Instagram Story:
  - iOS uses `instagram-stories://share` after writing `com.instagram.sharedSticker.backgroundImage` or `com.instagram.sharedSticker.backgroundVideo` to `UIPasteboard`.
  - Android uses `com.instagram.share.ADD_TO_STORY`, package `com.instagram.android`, `FileProvider` content URI, and temporary read grants.
- Instagram Feed:
  - iOS uses `UIDocumentInteractionController` with `com.instagram.photo` for photos and a video UTI for MP4.
  - Android uses `ACTION_SEND`, package `com.instagram.android`, and a content URI in `Intent.EXTRA_STREAM`.
- TikTok:
  - Android first uses the official intent fallback path documented by TikTok for `com.zhiliaoapp.musically` and `com.ss.android.ugc.trill`.
  - iOS reports that TikTok Share Kit must be configured instead of opening TikTok home or a generic share sheet.
- Snapchat Story:
  - The button is wired to a native function, but direct Creative Kit sharing requires Snap app setup/code-only integration before it can open Snapchat's composer.
- YouTube:
  - Android targets the YouTube app with an attached MP4.
  - iOS uses the native system share sheet with MP4 attached because YouTube does not expose a reliable direct upload composer URL scheme.

## Native/App Setup Still Required

TikTok Share Kit and Snap Creative Kit cannot be completed with only URL schemes.

- TikTok requires a `client_key`, Share Kit product enablement in the TikTok developer portal, and redirect/callback configuration.
- Snap Creative Kit currently recommends its newer code-only Creative Kit path. It supports local PNG/JPEG images and MP4/MOV videos, then opens Snapchat's preview flow for the user to finish sending or posting.
- Instagram Story sharing should include `EXPO_PUBLIC_INSTAGRAM_APP_ID` so Instagram can identify the registered Facebook/Meta app.

Add public IDs to `.env`:

```bash
EXPO_PUBLIC_INSTAGRAM_APP_ID=
EXPO_PUBLIC_TIKTOK_CLIENT_KEY=
EXPO_PUBLIC_SNAPCHAT_CLIENT_ID=
```

## Real Device Test Checklist

iOS:

- Rebuild the dev client after native changes.
- Install Instagram, share a photo to Instagram Story, confirm the Story composer opens with media attached.
- Install Instagram, share a photo/video to Instagram Feed, confirm the Open In/Instagram flow receives the media.
- With Instagram uninstalled, confirm Cenaiva shows a clear direct-composer unavailable error.
- Install TikTok and Snapchat, confirm Cenaiva shows clear setup-required errors until their direct integrations are configured.
- Share a video to YouTube through the system share sheet on iOS.

Android:

- Generate/rebuild the Android native project so the local Expo module, `FileProvider`, and manifest queries are merged.
- Install Instagram, share photo/video to Story and Feed.
- Install TikTok, share photo/video and confirm TikTok composer receives the media.
- Confirm Snapchat shows a setup-required error until Creative Kit setup is completed.
- Confirm YouTube opens from its Android package-targeted share intent for MP4 files.
- Repeat app-not-installed cases and Android 11+ package visibility checks.

## References

- Snap Creative Kit overview: https://developers.snap.com/snap-kit/creative-kit/overview
- TikTok Share Kit Android: https://developers.tiktok.com/doc/share-kit-android-quickstart-v2
- TikTok Share Kit iOS: https://developers.tiktok.com/doc/share-kit-ios-quickstart-v2
- Android FileProvider: https://developer.android.com/reference/androidx/core/content/FileProvider
- Android package visibility: https://developer.android.com/training/package-visibility/declaring
- Apple UIActivityViewController: https://developer.apple.com/documentation/uikit/uiactivityviewcontroller/
- YouTube Data API uploads: https://developers.google.com/youtube/v3/docs/videos/insert
