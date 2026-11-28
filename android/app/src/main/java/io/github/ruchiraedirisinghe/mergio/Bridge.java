package io.github.ruchiraedirisinghe.mergio;

import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import android.util.Base64;
import android.webkit.JavascriptInterface;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
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

    /* ---------- the "I'm live" status picture ---------- */
    private static final String WHATSAPP = "com.whatsapp", WHATSAPP_BUSINESS = "com.whatsapp.w4b", TELEGRAM = "org.telegram.messenger";
    private static final int MAX_PICTURE = 12 * 1024 * 1024;

    private boolean installed(String pkg) {
        try { activity.getPackageManager().getPackageInfo(pkg, 0); return true; }
        catch (PackageManager.NameNotFoundException e) { return false; }
    }

    private static byte[] decode(String base64) {
        if (base64 == null || base64.isEmpty() || base64.length() > MAX_PICTURE * 4 / 3) return null;
        try { return Base64.decode(base64, Base64.DEFAULT); } catch (IllegalArgumentException e) { return null; }
    }

    /** Saves the picture in the app's share folder (older pictures there are removed) and returns its link. */
    private Uri keep(byte[] jpeg) throws Exception {
        File dir = ShareProvider.dir(activity);
        if (!dir.isDirectory() && !dir.mkdirs()) throw new Exception("No share folder");
        File[] old = dir.listFiles();
        if (old != null) for (File f : old) if (System.currentTimeMillis() - f.lastModified() > 60 * 60 * 1000) f.delete();
        File f = new File(dir, "mergio-live-" + System.currentTimeMillis() + ".jpg");
        try (OutputStream out = new FileOutputStream(f)) { out.write(jpeg); }
        return ShareProvider.uriFor(activity, f);
    }

    /**
     * Shares the status picture (a base64 JPEG) with its caption. target: "status" opens WhatsApp's status screen,
     * "whatsapp" and "telegram" open that app's chat list, anything else the phone's share menu.
     * Returns "ok", "missing" (that app isn't on the phone) or "error".
     */
    @JavascriptInterface public String shareImage(String base64, String caption, String target) {
        String t = target == null ? "" : target;
        String pkg = null;
        if (t.equals("status") || t.equals("whatsapp")) {
            pkg = installed(WHATSAPP) ? WHATSAPP : installed(WHATSAPP_BUSINESS) ? WHATSAPP_BUSINESS : null;
            if (pkg == null) return "missing";
        } else if (t.equals("telegram")) {
            if (!installed(TELEGRAM)) return "missing";
            pkg = TELEGRAM;
        }
        byte[] jpeg = decode(base64);
        if (jpeg == null) return "error";
        Uri uri;
        try { uri = keep(jpeg); } catch (Exception e) { return "error"; }
        Intent send = new Intent(Intent.ACTION_SEND).setType("image/jpeg")
            .putExtra(Intent.EXTRA_STREAM, uri)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        send.setClipData(ClipData.newRawUri("Mergio", uri));
        if (caption != null && !caption.trim().isEmpty()) send.putExtra(Intent.EXTRA_TEXT, caption.length() > 4000 ? caption.substring(0, 4000) : caption);
        if (pkg != null) send.setPackage(pkg);
        // WhatsApp's own way to start a status with a picture
        if (t.equals("status")) send.putExtra("jid", "status@broadcast");
        Intent menu = Intent.createChooser(new Intent(send).setPackage(null), "Share your live picture");
        Intent go = send.getPackage() == null ? menu : send;
        activity.runOnUiThread(() -> {
            try { activity.startActivity(go); }
            catch (ActivityNotFoundException e) { try { activity.startActivity(menu); } catch (ActivityNotFoundException ignored) { } }
        });
        return "ok";
    }

    /** Saves the status picture in the phone's Pictures/Mergio folder. Returns false on Android 9 and older. */
    @JavascriptInterface public boolean savePicture(String base64) {
        byte[] jpeg = decode(base64);
        if (jpeg == null || Build.VERSION.SDK_INT < 29) return false;
        ContentResolver cr = activity.getContentResolver();
        ContentValues v = new ContentValues();
        v.put(MediaStore.Images.Media.DISPLAY_NAME, "Mergio live " + new SimpleDateFormat("yyyy-MM-dd HH.mm.ss", Locale.US).format(new Date()) + ".jpg");
        v.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
        v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Mergio");
        Uri uri = cr.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
        if (uri == null) return false;
        try (OutputStream out = cr.openOutputStream(uri)) {
            if (out == null) throw new Exception("No file");
            out.write(jpeg);
            return true;
        } catch (Exception e) {
            cr.delete(uri, null, null);
            return false;
        }
    }

    void shutdown() { if (tts != null) { tts.shutdown(); tts = null; } }
}
