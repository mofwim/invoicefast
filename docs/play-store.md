# Publishing ScanFast to Google Play

The Android app is the same code as `/scan`, wrapped by [Capacitor](https://capacitorjs.com).
The web layer is bundled into the APK, so the app installs and runs with no
network at all — including OCR.

## What you need once

- **Android Studio** (or just the Android SDK command-line tools) with
  **JDK 17+**. The Gradle wrapper handles Gradle itself.
- A **Google Play Console** account (one-time $25).
- Roughly 15 minutes for the first upload.

> The APK cannot be built without the Android SDK. Everything else in this
> repo — the web bundle, the native project, the icons, the store graphics —
> is already generated and committed.

## Build

```bash
npm install
npm run android:build     # static export + offline OCR + cap sync
npm run android:apk       # debug APK, for installing on your own phone
```

The debug APK lands at
`android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to a phone and
install it (you will have to allow "install unknown apps" once).

To open the project in Android Studio instead:

```bash
npm run android:open
```

### What `android:build` does beyond `next build`

1. Sets `CAPACITOR_BUILD=1`, which switches Next to static export
   (`output: 'export'`, `trailingSlash: true`).
2. Runs `vendor:ocr`, copying the OCR engine and the English + Arabic language
   data into `public/tesseract`. A store app that needs a CDN to read a receipt
   is not an offline app.
3. Writes `out/index.html` as a launcher that jumps to `/scan/`. The web deploy
   keeps the invoice generator at `/`; the Android app is the scanner and should
   open on it.
4. Runs `npx cap sync android`.

This adds about 32 MB to the download. If you would rather ship a small APK and
let OCR fetch from the CDN on first use, delete the `vendor-ocr` step from
`scripts/build-android.mjs` — `lib/scan/ocr.js` falls back to the CDN on its own.

## Signing

Play requires a signed release. Create an upload key **once** and never lose it:
losing it means you cannot ship updates to the same listing without Google's
key-reset process.

```bash
keytool -genkey -v -keystore ~/scanfast-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Then create `android/keystore.properties` (gitignored — never commit it):

```properties
storeFile=/absolute/path/to/scanfast-upload.jks
storePassword=…
keyAlias=upload
keyPassword=…
```

`android/app/build.gradle` picks that file up automatically. Without it the
release build still configures; it just produces an unsigned artifact.

Back up the `.jks` file and its passwords somewhere you will still have in three
years. Also turn on **Play App Signing** in the console — then Google holds the
distribution key and your upload key can be reset if it is ever lost.

## Release build

```bash
npm run android:build
npm run android:aab       # android/app/build/outputs/bundle/release/app-release.aab
```

Play wants the `.aab` (App Bundle), not an APK.

Bump these in `android/app/build.gradle` for every upload —
`versionCode` must strictly increase or the console rejects the file:

```gradle
versionCode 1        // 2, 3, 4 …
versionName "1.0"    // what users see
```

## Store listing

Everything Play asks for graphically is in [`store/`](../store), generated from
the running app by `scripts/store-assets.mjs`:

| File                    | Play field       | Spec               |
| ----------------------- | ---------------- | ------------------ |
| `icon-512.png`          | App icon         | 512×512 PNG        |
| `feature-graphic.png`   | Feature graphic  | 1024×500 PNG       |
| `screenshot-*.png`      | Phone screenshots| 1079×2280, need ≥2 |

Regenerate after a UI change (screenshots that no longer match the app are a
common review rejection):

```bash
npm i -D playwright && npx playwright install chromium
npm run android:build
node scripts/serve-out.mjs &
STORE_FIXTURE=path/to/a/photo-of-a-page.png node scripts/store-assets.mjs
```

### Suggested text

**App name (30 max)** — `ScanFast — ماسح مستندات PDF`

**Short description (80 max)**

> صوّر أي ورقة وحوّلها إلى PDF نظيف. قص تلقائي، إزالة ظلال، واستخراج نص.

**Full description**

> ماسح مستندات سريع يحوّل كاميرا جوالك إلى سكانر حقيقي.
>
> • كشف تلقائي لحواف الورقة أثناء التصوير، مع التقاط تلقائي عند ثبات الجهاز
> • تصحيح الميلان وتحويل الصورة المائلة إلى صفحة مستقيمة
> • إزالة الظلال وتحسين الإضاءة، وفلاتر: تلقائي، ألوان، رمادي، أبيض وأسود
> • مستندات متعددة الصفحات مع إعادة ترتيب وحذف وإعادة قص
> • استخراج النص (OCR) بالعربية والإنجليزية وست لغات أخرى
> • تصدير PDF قابل للبحث، أو صور، أو ملف نصي — ومشاركته مباشرة
>
> كل شيء يتم داخل جهازك: لا حساب، ولا تسجيل دخول، ولا رفع ملفات إلى أي خادم.
> يعمل بدون إنترنت بالكامل، بما في ذلك استخراج النص.

Add an English translation in the console under *Store listing → Manage
translations* — it roughly doubles reach for a utility app.

## Privacy policy

Play requires a reachable URL, and specifically one covering camera use. The
repo serves one at **`/privacy`** (`app/privacy/page.js`) — deploy the web app
and use `https://<your-domain>/privacy`.

## Data safety form

The app collects nothing, which makes this section short. Answer:

- **Does your app collect or share any of the required user data types?** → No
- **Is all of the user data encrypted in transit?** → N/A (no data is transmitted)
- **Do you provide a way for users to request that their data is deleted?** →
  N/A; documents are deleted from the device in the app itself.

Do not tick "Photos and videos". That category is about *collecting* them — the
app reads the camera and keeps the result on-device, which is not collection.
Describe the camera use under *App content → Permissions* instead.

## Content rating

Answer the questionnaire honestly: no violence, no user-generated content
sharing, no ads, no purchases. A productivity utility lands at **Everyone / 3+**.

## Review notes

Worth pasting into *App content → App access* so a reviewer is not confused:

> The app requires no login. Camera permission is used only to photograph a
> document for scanning; images are processed on-device and never uploaded. All
> features are available immediately after install, offline.

## Release checklist

- [ ] `versionCode` incremented, `versionName` updated
- [ ] `npm run android:build && npm run android:aab` produces a signed `.aab`
- [ ] Installed the debug APK on a real phone and confirmed: camera preview,
      edge detection, capture, crop, filters, OCR, and PDF share
- [ ] `store/` graphics match the current UI
- [ ] Privacy policy URL live
- [ ] Data safety + content rating submitted
- [ ] Internal testing track first — never straight to production

## Known gaps

- **Android share target.** The PWA can receive images shared from other apps
  (`share_target` in the manifest). The native app cannot yet: it needs an
  `ACTION_SEND` intent filter plus Java to hand the received URIs to the web
  layer. Not implemented because it cannot be tested without a device.
- **The native export path is untested on hardware.** `lib/scan/platform.js`
  writes to `Directory.Cache` and opens the system share sheet, which is the
  standard Capacitor flow, but it has only been verified in a browser where the
  web path runs instead. Check it on a phone before your first release.
