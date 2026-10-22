package ma.oustadiplus.capture

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.os.Build
import android.view.WindowManager
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CaptureProtectionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("OustadiCaptureProtection")

    AsyncFunction("ensureProtection") {
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
      // Opt out of playback capture as well as capture of the window pixels.
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val audio = activity.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audio.setAllowedCapturePolicy(AudioAttributes.ALLOW_CAPTURE_BY_NONE)
        check(audio.allowedCapturePolicy == AudioAttributes.ALLOW_CAPTURE_BY_NONE) {
          "Audio capture policy was not applied"
        }
      }
      check((activity.window.attributes.flags and WindowManager.LayoutParams.FLAG_SECURE) != 0) {
        "Secure window flag was not applied"
      }
      // FLAG_SECURE blocks pixels; this is not a recording-detection signal.
      mapOf("captured" to false)
    }.runOnQueue(Queues.MAIN)
  }
}
