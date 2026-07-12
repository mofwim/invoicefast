# InvoiceFast — free invoice generator (web)

A fast, no-signup invoice generator for freelancers. Fill the form, see a live
preview, download a clean PDF. Free with a small watermark; one-time $9 removes it.
Multi-currency (USD / EUR / GBP). All data stays in the user's browser.

Built with Next.js 14 + jsPDF. Deploys to Vercel in minutes.

---

## Run locally

```bash
cd invoice-app
npm install
npm run dev
```
Open http://localhost:3000

## Deploy to Vercel

1. Push this folder to a GitHub repo (e.g. mofwim/invoicefast).
2. On vercel.com → New Project → import the repo → Deploy.
3. Done. Add your custom domain in Vercel settings (e.g. invoicefast.app).

No environment variables needed for the base app.

---

## 💰 Turn on real payments (the important part)

Right now the "Unlock" button flips a local flag instantly (demo mode). To earn
real money, connect a checkout. Easiest option for a one-time digital unlock:

### Option A — Lemon Squeezy (simplest, handles EU/US tax for you)
1. Create a product ($9 one-time) at lemonsqueezy.com.
2. Get the checkout URL or use their overlay.
3. In `app/page.js`, replace the body of `unlock()` so it opens checkout, and
   only call `localStorage.setItem(PAID_KEY,'1')` after a successful payment
   (via their success redirect or webhook).

### Option B — Stripe Payment Links
1. Create a $9 Payment Link in the Stripe dashboard.
2. Point the "Unlock now" button at the link.
3. On the success URL, set the paid flag.

> The current localStorage unlock is per-device and not secure — fine for MVP,
> but for a real paywall, verify payment server-side before unlocking.

---

## Why this can actually make money

- Freelancers worldwide need invoices and dislike bloated tools with forced signups.
- Free tier (with watermark) drives traffic and SEO; the $9 unlock converts the
  users who send invoices to clients and want them clean and branded.
- Zero server cost on Vercel's free tier until you scale.
- Growth: rank for "free invoice generator", "invoice pdf no signup" via the
  metadata already set in `app/layout.js`, plus a short blog / templates later.

## Roadmap ideas
- Logo upload (Pro)
- Save multiple clients / recurring invoices (Pro)
- More templates and color themes (Pro)
- Send invoice by email
- "Duplicate last invoice" for repeat clients

---

## Files

```
invoice-app/
├── app/
│   ├── layout.js      metadata + SEO
│   ├── page.js        the whole app (form + live preview + paywall)
│   └── globals.css    styling
├── lib/
│   └── pdf.js         PDF generation + totals (jsPDF)
├── package.json
└── next.config.js
```
