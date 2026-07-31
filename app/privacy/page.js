export const metadata = {
  title: 'Privacy Policy — ScanFast',
  description:
    'ScanFast does not collect, transmit or store any personal data. Scans stay on your device.',
};

/**
 * Google Play requires a reachable privacy policy URL for every app, and one
 * that specifically covers camera use. This page is that URL.
 *
 * It is deliberately short because the app genuinely does nothing that needs
 * explaining away: no account, no analytics, no network calls with user data.
 */
const UPDATED = 'July 2026';

const SECTIONS = [
  {
    ar: 'ما الذي نجمعه',
    en: 'What we collect',
    bodyAr:
      'لا شيء. لا يوجد حساب، ولا تسجيل دخول، ولا تتبّع، ولا إحصاءات استخدام، ولا إعلانات. التطبيق لا يرسل أي بيانات عنك إلى أي خادم.',
    bodyEn:
      'Nothing. There is no account, no sign-in, no tracking, no analytics and no advertising. The app sends no data about you to any server.',
  },
  {
    ar: 'الكاميرا',
    en: 'Camera',
    bodyAr:
      'يطلب التطبيق إذن الكاميرا لغرض واحد: تصوير المستند الذي تريد مسحه. تُعالَج الصورة داخل جهازك مباشرة، ولا تُرفع إلى أي مكان.',
    bodyEn:
      'The app requests camera permission for one purpose: photographing the document you want to scan. The image is processed on your device and is never uploaded anywhere.',
  },
  {
    ar: 'أين تُحفظ ملفاتك',
    en: 'Where your files live',
    bodyAr:
      'تُحفظ المستندات الممسوحة في تخزين المتصفح/التطبيق على جهازك وحده. عند حذف مستند من داخل التطبيق أو حذف بيانات التطبيق، يُحذف نهائيًا ولا توجد لدينا نسخة منه. الملفات التي تصدّرها أو تشاركها تذهب فقط إلى الوجهة التي تختارها أنت.',
    bodyEn:
      'Scanned documents are stored only in app/browser storage on your device. Deleting a document in the app — or clearing the app data — removes it permanently; we hold no copy. Files you export or share go only to the destination you choose.',
  },
  {
    ar: 'استخراج النص (OCR)',
    en: 'Text recognition (OCR)',
    bodyAr:
      'يعمل استخراج النص داخل جهازك. في نسخة أندرويد يكون محرك التعرف مضمّنًا في التطبيق، فلا يحتاج إنترنت إطلاقًا. في نسخة الويب قد يُنزَّل المحرك وملفات اللغة مرة واحدة من شبكة توزيع محتوى عامة (jsDelivr)؛ هذا التنزيل يجلب ملفات برمجية فقط، ولا تُرسل صورك أو نصوصك في أي وقت.',
    bodyEn:
      'Text recognition runs on your device. In the Android app the engine is bundled inside the app, so it needs no internet at all. On the web the engine and language files may be downloaded once from a public CDN (jsDelivr); that download fetches program files only — your images and text are never sent anywhere.',
  },
  {
    ar: 'الأطفال',
    en: 'Children',
    bodyAr:
      'التطبيق لا يجمع بيانات من أي مستخدم، بمن فيهم الأطفال، لأنه لا يجمع بيانات على الإطلاق.',
    bodyEn:
      'The app collects no data from any user, including children, because it collects no data at all.',
  },
  {
    ar: 'التغييرات والتواصل',
    en: 'Changes and contact',
    bodyAr:
      'إذا تغيّرت هذه السياسة سيُحدَّث هذا الصفحة وتاريخها. لأي سؤال يمكنك مراسلتنا عبر البريد المذكور في صفحة التطبيق على Google Play.',
    bodyEn:
      'If this policy changes, this page and its date will be updated. For any question, contact us at the email address shown on the app’s Google Play listing.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="wrap" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Privacy Policy — ScanFast</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 4 }}>
        Last updated: {UPDATED}
      </p>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        ScanFast works entirely on your device. It has no servers, no accounts and no analytics.
      </p>

      {SECTIONS.map((s) => (
        <section key={s.en} className="card" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, marginBottom: 10 }}>
            {s.en} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>/ {s.ar}</span>
          </h2>
          <p style={{ fontSize: 14, marginBottom: 12 }}>{s.bodyEn}</p>
          <p dir="rtl" lang="ar" style={{ fontSize: 14, lineHeight: 1.8 }}>
            {s.bodyAr}
          </p>
        </section>
      ))}

      <p style={{ fontSize: 14, marginTop: 22 }}>
        <a href="/scan">← Back to ScanFast</a>
      </p>
    </main>
  );
}
