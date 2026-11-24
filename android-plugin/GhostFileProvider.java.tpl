package __APP_PACKAGE__;

import androidx.core.content.FileProvider;

/** Отдельный FileProvider для выдачи скачанного APK установщику (не конфликтует с провайдером Capacitor). */
public class GhostFileProvider extends FileProvider {}
