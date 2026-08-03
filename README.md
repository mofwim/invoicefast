This repository holds two products:

- **InvoiceFast** (`/`) — a free invoice generator.
- **Mijn Afspraken** (`/afspraken`) — an appointment overview that pulls
  appointments out of a calendar and out of e-mail. See [its section below](#mijn-afspraken--al-je-afspraken-op-één-plek).

---

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

---

# Mijn Afspraken — al je afspraken op één plek

For people whose appointments arrive scattered across a calendar and an inbox,
and who would rather not go looking. One page, three tabs — **Voorbij**,
**Binnenkort**, **Later** — showing the time, the date, who it is with, where it
is, and the papers that belong to it.

Live at **`/afspraken`**. Installable as an app, and embeddable in other sites.

### What it does

**Brings appointments in from anywhere**

| Source | How |
| --- | --- |
| Google, Outlook, Apple Calendar | paste the ICS link; it re-syncs by itself |
| `.ics` files | drop them on the page |
| E-mail (`.eml`) | drop it on the page — invitations *and* ordinary confirmations |
| Pasted text | paste the mail; the date is read out of the prose |
| By hand | for what exists nowhere else |

An `.eml` with a `text/calendar` part is read exactly. A plain confirmation
("uw afspraak is op dinsdag 4 augustus om 9:15") is *inferred*: the reader sees
what was found, with the sentence it came from, and corrects it before it is
kept. Attachments travel with the appointment and stay openable afterwards.

### The reader is the point

Mail is not written the way a parser would like it. The corpus in
`tests/import.test.mjs` is the specification — every case is a shape that
turns up in a real inbox.

*It reads how people write:*

| Written | Understood as |
| --- | --- |
| `dinsdag 4 augustus 2026 om 09:15` | 4 Aug, 09:15 |
| `morgen`, `vanavond`, `overmorgen` | relative to today |
| `aanstaande donderdag`, `volgende week woensdag` | the right weekday |
| `donderdag om 08:30` (no date anywhere) | the coming Thursday |
| `half elf` | 10:30 — the Dutch half is *before* the hour |
| `kwart over negen`, `tien over acht` | 09:15, 08:10 |
| `half drie 's middags`, `7 uur 's avonds` | 14:30, 19:00 |
| `tussen 13:00 en 15:00`, `van 9 uur tot 12 uur` | one block, with an end |
| `08/13/2026`, `05.08.2026`, `2026-08-13` | day-first, unless only month-first fits |
| `5 januari` in August | January *next* year |

*And it knows what is not an appointment:*

- `Factuurdatum:`, `Vervaldatum:`, `geboortedatum`, `verzonden op` — paperwork,
  skipped, so an invoice mail yields nothing at all
- a date more than a year old — history, not a plan
- `is geannuleerd` — kept, but struck through, not silently added as normal
- `verzet naar <nieuwe datum>` — the new date wins; the old one is not offered
  as a second appointment
- `Afzeggen kan tot 24 uur van tevoren` — an instruction, not a cancellation

*It also picks up what the card should show:*

- **Meenemen** — "Neem uw verzekeringspas en identiteitsbewijs mee" becomes a
  checklist, because that is the part people forget
- **Telefoonnummer** — becomes a call button, because that is how an
  appointment gets moved (an order number of the same length does not)
- **Locatie, met wie, bijlagen** — from labels, from a postcode line, from the
  MIME parts

Anything read from prose carries a confidence score; below 0.75 the card is
marked *Controleer* and shows the sentence it was taken from.

**Colours the list by urgency.** Every card carries a `--heat` value (how close
it is) and a per-tier hue, so the background answers "how soon?" before a word
is read: emerald while it is running, red within two hours, orange today, amber
tomorrow, cooling through teal and blue as it recedes, and fading further into
grey the longer ago it was.

**Warns about a double booking.** Two appointments that overlap both carry an
*Overlap* badge naming the other one. Touching edges do not count, and neither
do all-day entries or cancelled ones.

**Reminds you.** A notification 10 minutes to a day ahead, whichever you pick.
There is no push server here, so the honest limit is stated in the settings
too: it arrives while the page or the installed app is open, including in the
background. A reminder whose moment already passed is never fired late.

**Stays on the device.** Appointments live in `localStorage`, attachment bytes
in IndexedDB. The only network call is fetching a calendar link you added
yourself, which goes through `/api/ics` because browsers block cross-origin
calendar downloads. That proxy stores nothing and refuses internal addresses.

### Everywhere

- **Website** — `/afspraken`
- **App** — a web manifest and a service worker make it installable; it opens
  and works without a connection
- **Inside other sites** — one script tag; see `/afspraken/insluiten`

```html
<script src="https://jouw-domein.nl/embed.js"
        data-mijn-afspraken
        data-tab="binnenkort"></script>
```

### How it is put together

```
app/
├── afspraken/
│   ├── page.js              the page
│   ├── AfsprakenApp.js      tabs, list, search, keyboard shortcuts
│   ├── useAfspraken.js      all state; everything else is derived
│   ├── AppointmentCard.js   one appointment, collapsed and expanded
│   ├── SourcesSheet.js      adding and managing sources
│   ├── ImportReview.js      check-and-correct before anything is kept
│   ├── ManualForm.js        typing one in by hand
│   ├── afspraken.css        the design tokens and the urgency scale
│   └── insluiten/           the embedding guide
├── embed/afspraken/         the widget as it runs in someone else's page
└── api/ics/route.js         read-only calendar proxy (SSRF-guarded)

lib/afspraken/
├── ics.js         RFC 5545: folding, parameters, RRULE, EXDATE, overrides
├── tz.js          zoned wall time → real instant, via Intl
├── email.js       MIME, RFC 2047, base64/quoted-printable, attachments
├── datetext.js    reading dates, times and details out of prose
├── model.js       one shape for everything; buckets, urgency, conflicts
├── store.js       sources, sync, persistence, overrides
├── reminders.js   scheduling notifications
├── idb.js         attachment bytes
└── demo.js        the worked example

tests/            121 tests; import.test.mjs is the corpus of real mail shapes
```

### Running it

```bash
npm install
npm run dev     # http://localhost:3000/afspraken
npm test        # the parsers and the model
```

The parsers are plain modules with no browser dependencies, so `node --test`
runs them directly — `lib/afspraken/package.json` marks the folder as ESM for
exactly that reason.

### Worth knowing

- Recurring appointments are expanded on the wall clock, so a weekly 09:00
  meeting stays at 09:00 across a DST switch.
- `RECURRENCE-ID` overrides replace the single occurrence they refer to.
- The same meeting arriving from two sources collapses into one row, keeping
  whatever detail either copy had.
- Edits you make are stored apart from the synced data, so a renamed
  appointment stays renamed after the next sync.
- An embedded widget has its own storage (browsers separate it from the host
  site), so pass `data-ics` when the embed needs to show something on a first
  visit.
