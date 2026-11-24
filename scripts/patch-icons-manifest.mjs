// Добавляет activity-alias для смены иконки и снимает LAUNCHER с MainActivity.
import fs from 'node:fs';
const p = 'android/app/src/main/AndroidManifest.xml';
if (!fs.existsSync(p)) process.exit(0);
let mf = fs.readFileSync(p, 'utf8');
const NAMES = ['launcher', 'blood', 'ice', 'amethyst', 'sunset', 'mono', 'ghost'];
if (!mf.includes('activity-alias')) {
  mf = mf.replace('<category android:name="android.intent.category.LAUNCHER" />', '<!-- launcher перенесён в activity-alias -->');
  const block = NAMES.map((n, i) => {
    const alias = '.Icon' + n.charAt(0).toUpperCase() + n.slice(1);
    return `        <!-- icons -->
        <activity-alias
            android:name="${alias}"
            android:enabled="${i === 0 ? 'true' : 'false'}"
            android:exported="true"
            android:icon="@mipmap/ic_${n}"
            android:roundIcon="@mipmap/ic_${n}_round"
            android:label="@string/app_name"
            android:targetActivity=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity-alias>
`;
  }).join('');
  mf = mf.replace('</application>', block + '    </application>');
  fs.writeFileSync(p, mf);
  console.log('манифест: ' + NAMES.length + ' вариантов иконки');
}
