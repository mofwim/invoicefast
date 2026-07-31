export const metadata = {
  title: "ScanFast — ماسح مستندات PDF مجاني بدون تسجيل",
  description:
    "صوّر أي ورقة وحوّلها إلى PDF نظيف: قص تلقائي للحواف، تصحيح الميلان، إزالة الظلال، فلتر أبيض وأسود، واستخراج النص (OCR). يعمل بالكامل داخل متصفحك بدون رفع أي ملف.",
  keywords:
    "ماسح مستندات, تحويل صورة الى pdf, سكانر pdf, document scanner, pdf scanner, scan to pdf, free scanner app, ocr عربي",
  openGraph: {
    title: "ScanFast — ماسح مستندات PDF مجاني",
    description:
      "حوّل أي ورقة إلى PDF احترافي من متصفح جوالك. قص تلقائي، إزالة ظلال، OCR — بدون تسجيل وبدون رفع ملفات.",
    type: "website",
  },
  applicationName: "ScanFast",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ScanFast" },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0e1116",
};

export default function ScanLayout({ children }) {
  return children;
}
