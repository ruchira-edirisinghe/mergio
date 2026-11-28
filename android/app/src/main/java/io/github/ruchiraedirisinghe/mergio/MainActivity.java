package io.github.ruchiraedirisinghe.mergio;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.net.HttpURLConnection;
import java.net.URL;

/** Shows Mergio's phone screens (served by Mergio itself on 127.0.0.1) in a full-screen web view. */
public class MainActivity extends Activity {
    private WebView web;
    private Bridge bridge;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private boolean loaded = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#14141d"));
        w.setNavigationBarColor(Color.parseColor("#14141d"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0b0b11"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false); // alert sounds
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        bridge = new Bridge(this);
        web.addJavascriptInterface(bridge, "MergioAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("127.0.0.1".equals(u.getHost())) return false;
                // links (GitHub, downloads) open in the browser, never inside the app
                if ("https".equals(u.getScheme())) startActivity(new Intent(Intent.ACTION_VIEW, u));
                return true;
            }
            @Override public void onReceivedError(WebView v, android.webkit.WebResourceRequest r, android.webkit.WebResourceError e) {
                if (r.isForMainFrame()) { loaded = false; ui.postDelayed(MainActivity.this::waitForMergio, 800); }
            }
        });
        web.loadDataWithBaseURL(null, SPLASH, "text/html", "utf-8", null);
        setContentView(web);

        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{ Manifest.permission.POST_NOTIFICATIONS }, 1);
        }
        NodeService.start(this);
        waitForMergio();
    }

    /** Mergio takes a moment to start: check every few hundred ms, then show it. */
    private void waitForMergio() {
        if (loaded || isFinishing()) return;
        new Thread(() -> {
            int port = NodeService.port();
            boolean up = false;
            if (port > 0) {
                try {
                    HttpURLConnection c = (HttpURLConnection) new URL("http://127.0.0.1:" + port + "/phone").openConnection();
                    c.setConnectTimeout(500);
                    c.setReadTimeout(1500);
                    up = c.getResponseCode() == 200;
                    c.disconnect();
                } catch (Exception ignored) { }
            }
            final boolean ready = up;
            ui.postDelayed(() -> {
                if (ready && !loaded) { loaded = true; web.loadUrl("http://127.0.0.1:" + port + "/phone"); }
                else if (!ready) waitForMergio();
            }, ready ? 0 : 300);
        }).start();
    }

    @Override public void onBackPressed() {
        // Back closes an open panel first; otherwise Mergio goes to the background and keeps the chats connected
        if (web.canGoBack()) web.goBack(); else moveTaskToBack(true);
    }

    @Override protected void onResume() {
        super.onResume();
        if (loaded) web.evaluateJavascript("window.mergioResume && window.mergioResume()", null);
    }

    @Override protected void onDestroy() {
        bridge.shutdown();
        web.destroy();
        super.onDestroy();
    }

    void keepScreenOn(boolean on) {
        ui.post(() -> { if (on) getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); else getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); });
    }

    private static final String SPLASH = "<!doctype html><meta name=viewport content='width=device-width'><body style='margin:0;height:100vh;display:grid;place-items:center;background:#0b0b11;color:#9b9bb2;font:500 15px Roboto,sans-serif'>"
            + "<div style='display:grid;justify-items:center;gap:14px'><svg width=56 height=56 viewBox='0 0 24 24'><path fill='#7c4dff' d='M3 20V5.5a1.5 1.5 0 0 1 2.6-1L12 11l6.4-6.5A1.5 1.5 0 0 1 21 5.5V20h-3.5v-9L12 16.5 6.5 11v9z'/></svg>Starting Mergio…</div></body>";
}
