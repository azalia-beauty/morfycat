package __APP_PACKAGE__;

import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.BridgeActivity;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkInstallerPlugin.class);
        super.onCreate(savedInstanceState);

        // Android 13+: без этого разрешения уведомления об обновлениях не показываются
        if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS")
                        != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{"android.permission.POST_NOTIFICATIONS"}, 7001);
        }

        // Фоновая проверка обновлений раз в 6 часов (работает при закрытом приложении)
        try {
            Constraints net = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
            PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(UpdateWorker.class, 6, TimeUnit.HOURS)
                    .setConstraints(net)
                    .build();
            WorkManager.getInstance(getApplicationContext())
                    .enqueueUniquePeriodicWork("morphin_update_check", ExistingPeriodicWorkPolicy.KEEP, req);
        } catch (Exception ignored) {
            // фоновая проверка — приятное дополнение; приложение должно запускаться в любом случае
        }
    }
}
