import ExpoModulesCore
import UIKit

private final class CenaivaDocumentInteractionDelegate: NSObject, UIDocumentInteractionControllerDelegate {}

public final class CenaivaSocialShareModule: Module {
  private var documentController: UIDocumentInteractionController?
  private let documentDelegate = CenaivaDocumentInteractionDelegate()

  public func definition() -> ModuleDefinition {
    Name("CenaivaSocialShare")

    AsyncFunction("shareToInstagramStory") { (mediaUrl: URL, mimeType: String, instagramAppId: String?, promise: Promise) in
      shareToInstagramStory(mediaUrl: mediaUrl, mimeType: mimeType, instagramAppId: instagramAppId, promise: promise)
    }
    .runOnQueue(.main)

    AsyncFunction("shareToInstagramFeed") { (mediaUrl: URL, mimeType: String, promise: Promise) in
      shareToInstagramFeed(mediaUrl: mediaUrl, mimeType: mimeType, promise: promise)
    }
    .runOnQueue(.main)

    AsyncFunction("shareToTikTok") { (mediaUrl: URL, mimeType: String, promise: Promise) in
      promise.reject(
        "TIKTOK_SHARE_KIT_CONFIGURATION_REQUIRED",
        "TikTok Share Kit requires a TikTok client key and native SDK setup before direct TikTok sharing can be used."
      )
    }
    .runOnQueue(.main)

    AsyncFunction("shareToSnapchat") { (_ mediaUrl: URL, _ mimeType: String, promise: Promise) in
      promise.reject(
        "SNAP_KIT_CONFIGURATION_REQUIRED",
        "Snapchat Creative Kit requires Snap app setup before direct Story sharing can be used."
      )
    }
    .runOnQueue(.main)

    AsyncFunction("shareToYouTube") { (videoUrl: URL, promise: Promise) in
      presentSystemShare(mediaUrl: videoUrl, promise: promise)
    }
    .runOnQueue(.main)
  }

  private func shareToInstagramStory(
    mediaUrl: URL,
    mimeType: String,
    instagramAppId: String?,
    promise: Promise
  ) {
    guard mediaUrl.isFileURL, FileManager.default.fileExists(atPath: mediaUrl.path) else {
      return promise.reject("MEDIA_FILE_NOT_FOUND", "The filtered media file could not be read.")
    }

    guard let storyUrl = URL(string: "instagram-stories://share"),
      UIApplication.shared.canOpenURL(storyUrl) else {
      return promise.reject("SOCIAL_APP_NOT_INSTALLED", "Instagram is not installed or cannot open Story sharing.")
    }

    do {
      let mediaData = try Data(contentsOf: mediaUrl)
      var pasteboardItem: [String: Any] = [
        mimeType.hasPrefix("video/")
          ? "com.instagram.sharedSticker.backgroundVideo"
          : "com.instagram.sharedSticker.backgroundImage": mediaData
      ]

      if let instagramAppId, !instagramAppId.isEmpty {
        pasteboardItem["com.instagram.sharedSticker.appID"] = instagramAppId
      }

      UIPasteboard.general.setItems(
        [pasteboardItem],
        options: [.expirationDate: Date().addingTimeInterval(5 * 60)]
      )

      UIApplication.shared.open(storyUrl, options: [:]) { didOpen in
        if didOpen {
          promise.resolve(nil)
        } else {
          promise.reject("SOCIAL_SHARE_FAILED", "Instagram did not accept the Story share request.")
        }
      }
    } catch {
      promise.reject(
        "MEDIA_READ_FAILED",
        "The filtered media file could not be prepared for Instagram Story: \(error.localizedDescription)"
      )
    }
  }

  private func shareToInstagramFeed(mediaUrl: URL, mimeType: String, promise: Promise) {
    guard mediaUrl.isFileURL, FileManager.default.fileExists(atPath: mediaUrl.path) else {
      return promise.reject("MEDIA_FILE_NOT_FOUND", "The filtered media file could not be read.")
    }

    guard let currentViewController = appContext?.utilities?.currentViewController() else {
      return promise.reject("MISSING_VIEW_CONTROLLER", "Cannot determine the current view controller for sharing.")
    }

    let controller = UIDocumentInteractionController(url: mediaUrl)
    controller.delegate = documentDelegate
    controller.uti = mimeType.hasPrefix("video/") ? "public.mpeg-4" : "com.instagram.photo"
    documentController = controller

    let didPresent = controller.presentOpenInMenu(
      from: currentViewController.view.bounds,
      in: currentViewController.view,
      animated: true
    )

    if didPresent {
      promise.resolve(nil)
    } else {
      promise.reject("SOCIAL_SHARE_FAILED", "Instagram Feed sharing is unavailable for this media file.")
    }
  }

  private func presentSystemShare(mediaUrl: URL, promise: Promise) {
    guard mediaUrl.isFileURL, FileManager.default.fileExists(atPath: mediaUrl.path) else {
      return promise.reject("MEDIA_FILE_NOT_FOUND", "The filtered media file could not be read.")
    }

    guard let currentViewController = appContext?.utilities?.currentViewController() else {
      return promise.reject("MISSING_VIEW_CONTROLLER", "Cannot determine the current view controller for sharing.")
    }

    let activityController = UIActivityViewController(activityItems: [mediaUrl], applicationActivities: nil)

    if UIDevice.current.userInterfaceIdiom == .pad {
      activityController.popoverPresentationController?.sourceView = currentViewController.view
      activityController.popoverPresentationController?.sourceRect = CGRect(
        x: currentViewController.view.bounds.midX,
        y: currentViewController.view.bounds.maxY,
        width: 0,
        height: 0
      )
    }

    activityController.completionWithItemsHandler = { _, _, _, _ in
      promise.resolve(nil)
    }

    currentViewController.present(activityController, animated: true)
  }
}
