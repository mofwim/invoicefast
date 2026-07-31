/**
 * Generates the Google Play listing graphics into ./store.
 *
 *   node scripts/build-android.mjs          # produces out/
 *   node scripts/serve-out.mjs &            # or any static server on :4180
 *   node scripts/store-assets.mjs
 *
 * Screenshots are captured from the real app rather than drawn as mockups, so
 * the listing always matches what ships. Play rejects mismatched screenshots,
 * and hand-made ones go stale the moment the UI changes.
 *
 * Playwright is not a dependency of this project — it is only needed to
 * regenerate these files, and the results are committed. Install it on demand:
 *   npm i -D playwright
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'store');
const BASE = process.env.STORE_BASE || 'http://localhost:4180';
const FIXTURE = process.env.STORE_FIXTURE; // optional sample page image

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright is required: npm i -D playwright');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const launch = {};
if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
const browser = await chromium.launch(launch);

/* ------------------------------------------------------------------ */
/* feature graphic (1024x500, required by Play)                         */
/* ------------------------------------------------------------------ */

const FEATURE_HTML = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1024px;height:500px;display:flex;align-items:center;gap:54px;padding:0 72px;
    background:radial-gradient(120% 140% at 88% 12%, #2f6df5 0%, #17224a 55%, #0e1116 100%);
    color:#fff;font-family:"Noto Sans Arabic","Segoe UI",system-ui,sans-serif;overflow:hidden}
  .copy{flex:1}
  h1{font-size:66px;font-weight:800;letter-spacing:-1px;line-height:1.06}
  h1 span{color:#8fb8ff}
  p{margin-top:20px;font-size:26px;line-height:1.55;color:#c9d6ec;max-width:19ch}
  .tags{margin-top:26px;display:flex;gap:10px}
  .tags b{font-size:17px;font-weight:600;padding:8px 16px;border-radius:999px;
    background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2)}
  .art{width:270px;height:360px;border-radius:20px;background:#fdfdfb;position:relative;
    transform:rotate(-6deg);box-shadow:0 40px 90px rgba(0,0,0,.55);flex:0 0 auto;padding:34px 28px}
  .art i{display:block;height:11px;border-radius:3px;background:#20242c;margin-bottom:15px}
  .art i.t{height:22px;width:62%;margin-bottom:26px}
  .art i.s{width:55%}
  .br{position:absolute;width:52px;height:52px;border:6px solid #58a0ff}
  .br.tl{top:-14px;right:-14px;border-left:0;border-bottom:0;border-radius:0 12px 0 0}
  .br.br2{bottom:-14px;left:-14px;border-right:0;border-top:0;border-radius:0 0 0 12px}
</style></head><body>
  <div class="copy">
    <h1>ماسح مستندات<br><span>بجودة احترافية</span></h1>
    <p>صوّر أي ورقة وحوّلها إلى PDF نظيف — بدون تسجيل، وبدون رفع ملفات.</p>
    <div class="tags"><b>قص تلقائي</b><b>إزالة الظلال</b><b>استخراج النص</b></div>
  </div>
  <div class="art">
    <span class="br tl"></span><span class="br br2"></span>
    <i class="t"></i><i></i><i></i><i class="s"></i><i></i><i></i><i class="s"></i><i></i>
  </div>
</body></html>`;

{
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.setContent(FEATURE_HTML, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, 'feature-graphic.png') });
  await page.close();
  console.log('wrote store/feature-graphic.png (1024x500)');
}

/* ------------------------------------------------------------------ */
/* phone screenshots, captured from the running app                     */
/* ------------------------------------------------------------------ */

// 1080x2280 after the device scale factor — inside Play's 320..3840 limits and
// a normal 9:19 phone aspect.
const PHONE = { viewport: { width: 415, height: 877 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true };

async function shoot(page, name) {
  await page.screenshot({ path: join(OUT, name) });
  console.log(`wrote store/${name}`);
}

const ctx = await browser.newContext(PHONE);
const page = await ctx.newPage();
const reachable = await page
  .goto(`${BASE}/scan/`, { waitUntil: 'networkidle', timeout: 15000 })
  .then(() => true)
  .catch(() => false);

if (!reachable) {
  console.error(`\ncannot reach ${BASE} — start a static server over ./out first`);
  await browser.close();
  process.exit(1);
}

const sample =
  FIXTURE && existsSync(FIXTURE)
    ? readFileSync(FIXTURE)
    : null;

if (!sample) {
  console.log('\nno STORE_FIXTURE image given — capturing the empty-library shot only');
  await page.waitForTimeout(800);
  await shoot(page, 'screenshot-1-library.png');
} else {
  await page.getByRole('button', { name: 'مسح جديد' }).click();
  await page.waitForTimeout(700);
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'page.png', mimeType: 'image/png', buffer: sample });
  await page.waitForTimeout(3200);
  await shoot(page, 'screenshot-1-detect.png'); // corner detection

  await page.getByRole('button', { name: 'متابعة' }).click();
  await page.waitForTimeout(4200);
  await shoot(page, 'screenshot-2-document.png'); // page grid

  await page.locator('.sf-page').first().click();
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'أبيض وأسود' }).click();
  await page.waitForTimeout(3000);
  await shoot(page, 'screenshot-3-filters.png'); // filters

  await page.getByRole('button', { name: 'إلغاء' }).first().click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'استخراج النص' }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'بدء الاستخراج' }).click();
  for (let i = 0; i < 70; i++) {
    await page.waitForTimeout(2000);
    const len = await page.evaluate(
      () => (document.querySelector('.sf-ocrtext')?.textContent || '').length
    );
    if (len > 10) break;
  }
  await page.waitForTimeout(500);
  await shoot(page, 'screenshot-4-ocr.png'); // recognised text

  await page.locator('.sf-scrim').first().click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /تصدير PDF/ }).click();
  await page.waitForTimeout(900);
  await shoot(page, 'screenshot-5-export.png'); // export options
}

// The 512x512 listing icon is the PWA icon; copy it so everything Play needs
// sits in one folder.
const icon = join(ROOT, 'public', 'icons', 'icon-512.png');
if (existsSync(icon)) {
  writeFileSync(join(OUT, 'icon-512.png'), readFileSync(icon));
  console.log('wrote store/icon-512.png (512x512)');
}

await browser.close();
console.log('\nstore/ is ready to upload to the Play Console.');
