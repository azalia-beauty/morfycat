package __APP_PACKAGE__;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONObject;

/**
 * Фоновая проверка обновлений: раз в несколько часов (даже когда приложение закрыто, а компьютер выключен)
 * читает version.json с GitHub и, если вышла новая версия, показывает системное уведомление.
 */
public class UpdateWorker extends Worker {
    static final String CHANNEL_ID = "morphin_updates";

    public UpdateWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            Context ctx = getApplicationContext();
            int resId = ctx.getResources().getIdentifier("ghost_update_url", "string", ctx.getPackageName());
            if (resId == 0) return Result.success();
            String url = ctx.getString(resId);
            if (url == null || !url.startsWith("https://")) return Result.success();

            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setConnectTimeout(15000);
            c.setReadTimeout(20000);
            c.setInstanceFollowRedirects(true);
            c.setRequestProperty("Cache-Control", "no-cache");
            if (c.getResponseCode() != 200) return Result.retry();

            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
            }
            JSONObject info = new JSONObject(sb.toString());
            String latest = info.optString("version", "");
            String notes = info.optString("notes", "");

            PackageInfo pi = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            String current = pi.versionName == null ? "0" : pi.versionName;

            if (cmp(latest, current) > 0) {
                SharedPreferences sp = ctx.getSharedPreferences("morphin_updates", Context.MODE_PRIVATE);
                if (!latest.equals(sp.getString("notified", ""))) {
                    if (notify(ctx, latest, notes)) sp.edit().putString("notified", latest).apply();
                }
            }
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }

    private boolean notify(Context ctx, String latest, String notes) {
        NotificationManagerCompat nm = NotificationManagerCompat.from(ctx);
        if (!nm.areNotificationsEnabled()) return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Обновления", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Уведомления о новых версиях приложения");
            NotificationManager sys = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (sys != null) sys.createNotificationChannel(ch);
        }

        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (launch == null) return false;
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, launch, flags);

        int icon = ctx.getResources().getIdentifier("ic_stat_update", "drawable", ctx.getPackageName());
        if (icon == 0) icon = android.R.drawable.stat_sys_download_done;

        String text = (notes == null || notes.isEmpty()) ? "Нажмите, чтобы открыть и обновить" : notes;
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setSmallIcon(icon)
                .setContentTitle("Доступно обновление " + latest)
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pi);
        try {
            nm.notify(7001, b.build());
            return true;
        } catch (SecurityException e) {
            return false;
        }
    }

    /** Сравнение версий вида 1.2.3: >0 если a новее b. */
    static int cmp(String a, String b) {
        String[] pa = a.replaceFirst("^v", "").split("\\.");
        String[] pb = b.replaceFirst("^v", "").split("\\.");
        int n = Math.max(pa.length, pb.length);
        for (int i = 0; i < n; i++) {
            int x = i < pa.length ? num(pa[i]) : 0;
            int y = i < pb.length ? num(pb[i]) : 0;
            if (x != y) return x > y ? 1 : -1;
        }
        return 0;
    }

    private static int num(String s) {
        try {
            return Integer.parseInt(s.replaceAll("[^0-9]", ""));
        } catch (Exception e) {
            return 0;
        }
    }
}
