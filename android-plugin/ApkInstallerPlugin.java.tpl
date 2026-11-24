package __APP_PACKAGE__;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * Скачивает APK по https и открывает системный установщик Android.
 * Для установки нужно разрешение «Установка из неизвестных источников» для этого приложения —
 * если его нет, открываем нужный экран настроек, и пользователь включает его один раз.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    private boolean canInstallNow() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true;
        return getContext().getPackageManager().canRequestPackageInstalls();
    }

    private void openInstallSettings() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
    }

    @PluginMethod
    public void getVersion(PluginCall call) {
        try {
            Context ctx = getContext();
            PackageInfo pi = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            JSObject ret = new JSObject();
            ret.put("versionName", pi.versionName);
            long code = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? pi.getLongVersionCode() : pi.versionCode;
            ret.put("versionCode", code);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("allowed", canInstallNow());
        call.resolve(ret);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        openInstallSettings();
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(final PluginCall call) {
        final String urlStr = call.getString("url", "");
        final String sha256 = call.getString("sha256", "");

        if (urlStr == null || !urlStr.startsWith("https://")) {
            call.reject("Нужна https-ссылка на APK");
            return;
        }

        if (!canInstallNow()) {
            openInstallSettings();
            JSObject ret = new JSObject();
            ret.put("status", "need_permission");
            call.resolve(ret);
            return;
        }

        new Thread(() -> {
            try {
                File dir = new File(getContext().getCacheDir(), "updates");
                //noinspection ResultOfMethodCallIgnored
                dir.mkdirs();
                File apk = new File(dir, "update.apk");
                if (apk.exists()) //noinspection ResultOfMethodCallIgnored
                    apk.delete();

                HttpURLConnection c = (HttpURLConnection) new URL(urlStr).openConnection();
                c.setConnectTimeout(15000);
                c.setReadTimeout(30000);
                c.setInstanceFollowRedirects(true);
                c.connect();
                int code = c.getResponseCode();
                if (code != 200) throw new Exception("Сервер ответил HTTP " + code);

                long total = c.getContentLength();
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                long received = 0;
                int lastPct = -1;

                try (InputStream in = c.getInputStream(); FileOutputStream out = new FileOutputStream(apk)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) != -1) {
                        out.write(buf, 0, n);
                        md.update(buf, 0, n);
                        received += n;
                        if (total > 0) {
                            int pct = (int) (received * 100 / total);
                            if (pct != lastPct) {
                                lastPct = pct;
                                JSObject p = new JSObject();
                                p.put("percent", pct);
                                p.put("received", received);
                                p.put("total", total);
                                notifyListeners("progress", p);
                            }
                        }
                    }
                }

                if (sha256 != null && !sha256.isEmpty()) {
                    StringBuilder hex = new StringBuilder();
                    for (byte b : md.digest()) hex.append(String.format("%02x", b));
                    if (!hex.toString().equalsIgnoreCase(sha256.trim())) {
                        //noinspection ResultOfMethodCallIgnored
                        apk.delete();
                        throw new Exception("Контрольная сумма не совпала — файл повреждён или подменён");
                    }
                }

                Context ctx = getContext();
                Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".ghostupdate", apk);
                Intent install = new Intent(Intent.ACTION_VIEW);
                install.setDataAndType(uri, "application/vnd.android.package-archive");
                install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(install);

                JSObject ret = new JSObject();
                ret.put("status", "installing");
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            }
        }).start();
    }
}
