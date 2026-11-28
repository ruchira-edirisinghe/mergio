package io.github.ruchiraedirisinghe.mergio;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;

import java.util.Locale;

/**
 * What the phone screens can ask the app to do (window.MergioAndroid). Only Mergio's own page on 127.0.0.1 is
 * ever loaded in the app, and links to other sites open in the browser.
 */
public class Bridge {
    private final MainActivity activity;
    private TextToSpeech tts;
    private boolean ttsReady = false;

    Bridge(MainActivity activity) { this.activity = activity; }

    @JavascriptInterface public void setKeepScreenOn(boolean on) { activity.keepScreenOn(on); }

    /** Reads a message aloud with the phone's own voice; messages wait in line. */
    @JavascriptInterface public void speak(String text) {
        if (text == null || text.trim().isEmpty()) return;
        String t = text.length() > 400 ? text.substring(0, 400) : text;
        if (tts == null) {
            tts = new TextToSpeech(activity.getApplicationContext(), status -> {
                ttsReady = status == TextToSpeech.SUCCESS;
                if (ttsReady) { tts.setLanguage(Locale.getDefault()); tts.speak(t, TextToSpeech.QUEUE_ADD, null, "m" + System.nanoTime()); }
            });
            return;
        }
        if (ttsReady) tts.speak(t, TextToSpeech.QUEUE_ADD, null, "m" + System.nanoTime());
    }

    @JavascriptInterface public void stopSpeaking() { if (tts != null) tts.stop(); }

    @JavascriptInterface public void vibrate(int ms) {
        Vibrator v = (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
        if (v == null || !v.hasVibrator()) return;
        int d = Math.max(10, Math.min(ms, 500));
        if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(d, VibrationEffect.DEFAULT_AMPLITUDE));
        else v.vibrate(d);
    }

    /** Opens a web link in the browser (https only). */
    @JavascriptInterface public void openUrl(String url) {
        if (url == null || !url.startsWith("https://")) return;
        activity.runOnUiThread(() -> activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))));
    }

    @JavascriptInterface public void copy(String text) {
        ClipboardManager cm = (ClipboardManager) activity.getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Mergio", text));
    }

    void shutdown() { if (tts != null) { tts.shutdown(); tts = null; } }
}
