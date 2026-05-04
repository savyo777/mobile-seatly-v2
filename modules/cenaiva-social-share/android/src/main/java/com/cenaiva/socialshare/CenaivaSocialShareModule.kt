package com.cenaiva.socialshare

import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class CenaivaSocialShareModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("CenaivaSocialShare")

    AsyncFunction("shareToInstagramStory") { mediaUri: String, mimeType: String, instagramAppId: String? ->
      val contentUri = contentUriFor(mediaUri)
      val intent = Intent("com.instagram.share.ADD_TO_STORY").apply {
        setPackage(INSTAGRAM_PACKAGE)
        setDataAndType(contentUri, mimeType)
        putExtra("source_application", instagramAppId ?: context.packageName)
        grantReadPermission(contentUri)
      }

      grantReadPermission(INSTAGRAM_PACKAGE, contentUri)
      startActivity(intent, "Instagram Story")
    }

    AsyncFunction("shareToInstagramFeed") { mediaUri: String, mimeType: String ->
      val contentUri = contentUriFor(mediaUri)
      val intent = Intent(Intent.ACTION_SEND).apply {
        setPackage(INSTAGRAM_PACKAGE)
        type = wildcardMimeType(mimeType)
        putExtra(Intent.EXTRA_STREAM, contentUri)
        grantReadPermission(contentUri)
      }

      grantReadPermission(INSTAGRAM_PACKAGE, contentUri)
      startActivity(intent, "Instagram Feed")
    }

    AsyncFunction("shareToTikTok") { mediaUri: String, mimeType: String ->
      val contentUri = contentUriFor(mediaUri)
      val errors = mutableListOf<Throwable>()

      for (packageName in TIKTOK_PACKAGES) {
        val intent = Intent(Intent.ACTION_SEND).apply {
          setPackage(packageName)
          type = if (mimeType.startsWith("video/")) "video/mp4" else "image/*"
          putExtra(Intent.EXTRA_STREAM, contentUri)
          grantReadPermission(contentUri)
        }

        grantReadPermission(packageName, contentUri)
        try {
          startActivity(intent, "TikTok")
          return@AsyncFunction
        } catch (error: Throwable) {
          errors.add(error)
        }
      }

      throw SocialShareException(
        "SOCIAL_APP_NOT_INSTALLED",
        "TikTok is not installed or cannot open the share composer.",
        errors.firstOrNull()
      )
    }

    AsyncFunction("shareToSnapchat") { _: String, _: String ->
      throw SocialShareException(
        "SNAP_KIT_CONFIGURATION_REQUIRED",
        "Snapchat Creative Kit requires Snap app setup before direct Story sharing can be used."
      )
    }

    AsyncFunction("shareToYouTube") { videoUri: String ->
      val contentUri = contentUriFor(videoUri)
      val intent = Intent(Intent.ACTION_SEND).apply {
        setPackage(YOUTUBE_PACKAGE)
        type = "video/mp4"
        putExtra(Intent.EXTRA_STREAM, contentUri)
        grantReadPermission(contentUri)
      }

      grantReadPermission(YOUTUBE_PACKAGE, contentUri)
      startActivity(intent, "YouTube")
    }
  }

  private fun contentUriFor(mediaUri: String): Uri {
    val uri = Uri.parse(mediaUri)
    if (uri.scheme != "file") {
      throw SocialShareException("UNSUPPORTED_MEDIA_URI", "Expected a local file URI for native sharing.")
    }

    val path = uri.path ?: throw SocialShareException("UNSUPPORTED_MEDIA_URI", "The media URI has no file path.")
    val file = File(path)
    if (!file.exists()) {
      throw SocialShareException("MEDIA_FILE_NOT_FOUND", "The filtered media file could not be read.")
    }

    return FileProvider.getUriForFile(
      context,
      "${context.packageName}.CenaivaSocialShareFileProvider",
      file
    )
  }

  private fun Intent.grantReadPermission(contentUri: Uri) {
    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    clipData = ClipData.newUri(context.contentResolver, "Cenaiva filtered media", contentUri)
  }

  private fun grantReadPermission(packageName: String, contentUri: Uri) {
    context.grantUriPermission(packageName, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
  }

  private fun startActivity(intent: Intent, label: String) {
    try {
      appContext.currentActivity?.startActivity(intent)
        ?: throw SocialShareException("MISSING_ACTIVITY", "No active Android activity is available for sharing.")
    } catch (error: ActivityNotFoundException) {
      throw SocialShareException("SOCIAL_APP_NOT_INSTALLED", "$label is not installed or cannot accept this media.", error)
    }
  }

  private fun wildcardMimeType(mimeType: String): String {
    return if (mimeType.startsWith("video/")) "video/*" else "image/*"
  }

  companion object {
    private const val INSTAGRAM_PACKAGE = "com.instagram.android"
    private const val YOUTUBE_PACKAGE = "com.google.android.youtube"
    private val TIKTOK_PACKAGES = listOf("com.zhiliaoapp.musically", "com.ss.android.ugc.trill")
  }
}

private class SocialShareException(
  code: String,
  message: String,
  cause: Throwable? = null
) : CodedException(code, message, cause)
