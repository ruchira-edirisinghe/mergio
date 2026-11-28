package io.github.ruchiraedirisinghe.mergio;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.ServiceInfo;
import android.content.res.AssetManager;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;

/**
 * Runs Mergio (Node.js) and keeps it running while the app is in the background, so the chats stay connected
 * and nothing is missed. Node can only start once per process: "Stop" in the notification ends the process.
 */
public class NodeService extends Service {
    static final String TAG = "Mergio";
    static final String CHANNEL = "running";
    static final String STOP = "io.github.ruchiraedirisinghe.mergio.STOP";
    static final int FIRST_PORT = 8787;

    private static volatile boolean started = false;
    private static volatile int port = 0;

    static { System.loadLibrary("mergio-node"); }

    static native int startNode(String[] args);
    static native void setEnv(String key, String value);

    /** The port Mergio listens on (0 until it has started). */
    static int port() { return port; }

    static void start(Context ctx) {
        Intent i = new Intent(ctx, NodeService.class);
        if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i); else ctx.startService(i);
    }

    @Override public void onCreate() {
        super.onCreate();
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, getString(R.string.channel_running), NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && STOP.equals(intent.getAction())) {
            stopForeground(true);
            stopSelf();
            // Node can't be stopped and started again in the same process
            android.os.Process.killProcess(android.os.Process.myPid());
            return START_NOT_STICKY;
        }
        Notification n = notification();
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(1, n);
        startNodeOnce();
        return START_STICKY;
    }

    private Notification notification() {
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(this, 1, new Intent(this, NodeService.class).setAction(STOP), PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        return b.setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(getString(R.string.running_title))
                .setContentText(getString(R.string.running_text))
                .setContentIntent(open)
                .setOngoing(true)
                .addAction(new Notification.Action.Builder(null, getString(R.string.stop), stop).build())
                .build();
    }

    private synchronized void startNodeOnce() {
        if (started) return;
        started = true;
        final File project = new File(getFilesDir(), "nodejs-project");
        final File data = new File(getFilesDir(), "data");
        final int p = freePort();
        Thread t = new Thread(null, () -> {
            try {
                copyAssetsIfNew(project);
                data.mkdirs();
                setEnv("TMPDIR", getCacheDir().getAbsolutePath());
                setEnv("HOME", data.getAbsolutePath());
                port = p;
                int code = startNode(new String[]{ "node", new File(project, "app/main.cjs").getAbsolutePath(), "--data=" + data.getAbsolutePath(), "--port=" + p });
                Log.w(TAG, "Mergio stopped (" + code + ")");
            } catch (Throwable e) {
                Log.e(TAG, "could not start Mergio", e);
            }
        }, "node", 16 * 1024 * 1024);
        t.start();
    }

    /** 8787 like the desktop app; the next free one if another app has it. */
    private static int freePort() {
        for (int p = FIRST_PORT; p < FIRST_PORT + 20; p++) {
            try (ServerSocket s = new ServerSocket()) {
                s.setReuseAddress(true);
                s.bind(new InetSocketAddress("127.0.0.1", p));
                return p;
            } catch (IOException ignored) { }
        }
        return FIRST_PORT;
    }

    /** Node can't read files inside the APK: copy Mergio's script and pages out after each install or update. */
    private void copyAssetsIfNew(File project) throws Exception {
        PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
        String stamp = pi.versionName + "/" + pi.lastUpdateTime;
        SharedPreferences prefs = getSharedPreferences("node", MODE_PRIVATE);
        if (stamp.equals(prefs.getString("assets", "")) && new File(project, "app/main.cjs").exists()) return;
        deleteTree(project);
        copyAssets(getAssets(), "nodejs-project", project);
        prefs.edit().putString("assets", stamp).apply();
        Log.i(TAG, "copied Mergio " + pi.versionName);
    }

    private static void copyAssets(AssetManager am, String from, File to) throws IOException {
        String[] kids = am.list(from);
        if (kids == null || kids.length == 0) {
            to.getParentFile().mkdirs();
            try (InputStream in = am.open(from); OutputStream out = new FileOutputStream(to)) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            return;
        }
        to.mkdirs();
        for (String k : kids) copyAssets(am, from + "/" + k, new File(to, k));
    }

    private static void deleteTree(File f) {
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteTree(k);
        f.delete();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
