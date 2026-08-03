A small market of tools that do their work in the browser. No account, no
upload, no queue — the file stays on the reader's device, and each tool says so
on its own page rather than as a slogan in a header.

**The market lives at `/nl/tools` and `/en/tools`.** Twenty-eight tools.

| Category | Tools |
| --- | --- |
| Images | compress · convert (JPG/PNG/WebP) · resize for social media · favicon set · watermark |
| PDF | [merge · split · organise · to images · to text · extract images · compress · properties · sign · images to PDF · watermark](#the-pdf-tools) |
| Text and code | word count · JSON formatter · base64 · compare two texts · slug and URL encoder |
| Generators | QR code · password · checksum (MD5/SHA) |
| Files | open a `.eml` and pull out its attachments |
| Calendar | ICS to CSV and back · [Mijn Afspraken](#mijn-afspraken--al-je-afspraken-op-één-plek) at `/afspraken` |
| Business | VAT calculator · IBAN validator · [InvoiceFast](#invoicefast--free-invoice-generator-web) at `/` |

Three of the engines are written here rather than pulled in, and each is tested
against something outside itself: the QR encoder is decoded by an independent
reader, MD5 against the RFC vectors and against Node's own crypto at every
padding boundary, and the ZIP writer is unpacked by the system's `unzip`.

Errors carry a *code*, not a sentence (`lib/tools/errors.js`). The engines are
language-agnostic and the market is not, so the page does the wording — a
failure that read as Dutch on an English page would simply be a bug.

### Adding a tool

Two steps, in any language:

1. An entry in `lib/tools/registry.js` — its words and its slug, per language.
2. A component in `components/tools/<id>/`, listed in `implementations.js`.

No page file and no routing change: one dynamic route serves the whole market,
and implementations load lazily so a visitor downloads only the tool they
opened while the words around it still render on the server. The palette lives
once in `styles/ios-theme.css`; shared chrome strings in `lib/i18n/ui.js`, each
tool's own strings in `lib/i18n/tools.js` with the languages side by side per
key, so a missing translation is visible at a glance.

### The PDF tools

Two libraries, because the job has two halves.

**pdf-lib** moves pages without ever looking inside them — merging, splitting,
reordering, rotating, stamping and signing all copy the original content
across untouched, so text stays text and a merged document is exactly as sharp
as what went into it.

**pdf.js** is the other half: it *draws*. Loaded only when a tool needs to see
the document, it gives the page grid real thumbnails instead of numbered grey
rectangles, exports pages as images at a chosen resolution, pulls the text back
out with the line breaks where they were, and lifts the embedded photographs
out at their own resolution — which is a different thing from a page that
happens to look like one. Its worker, character maps and
standard fonts are copied to `public/pdfjs/` at build time
(`scripts/copy-pdfjs.mjs`) rather than committed, so they cannot drift out of
step with the installed version, and each is fetched only when a document
actually asks for it.

**Compressing** is where the two meet, and it is done at the level of the
images rather than the page. The naive way — redraw every page as a picture —
makes a text document *bigger*, because a page of type compresses far worse as
pixels than as glyphs, and where it does win it wins by destroying what people
came for. So the compressor walks the object graph, rewrites only the embedded
image streams, and carries every text and vector object across untouched: a
1.8 MB scan comes down to 470 kB, and a document with text and photographs
together halves while every word stays a word. Anything it cannot decode
safely — a transparent image, a CMYK JPEG, a stencil mask — is left exactly as
it was, and the page says how many and why. Three rungs are offered in order of
what they cost, and the old page-rasteriser is kept as the last one for the
file that defeats the other two.

Every page grid is the same component (`components/tools/PageGrid.js`).
Reordering works by dragging and by two buttons, because drag-and-drop alone is
unusable from a keyboard and awkward on a phone.

The watermark preview is produced by the same call that produces the result —
one page put through the real operation and then rendered
(`samplePage` + `usePreview`). Drawing an approximation on top of a picture
would be faster and would eventually be wrong about something, which is the one
thing a preview must never be.

### Checking it

```bash
npm test            # 229 unit tests: the parsers, the encoders, the model
npm run verify      # all 28 tools driven in a browser, in both languages
```

`npm run verify` is six passes in `tests/browser/`, and each looks for a
different kind of wrong:

| Pass | What it would catch |
| --- | --- |
| `verify` | a tool that does not do its job — 58 runs across both languages |
| `inspect` | **opens what came out**: page counts, rotations, written metadata, whether the text survived compression, the soundness of the zip, the exported JPEGs at 1240×1754 for 150 dpi on A4 |
| `robust` | a wrong file: corrupt, empty, a photo renamed `.pdf`. A stack trace, a spinner that never stops, and saying nothing at all all count as failures |
| `phone` | 390 px with touch: sideways scrolling, targets a thumb cannot hit, signing with a finger |
| `phone` | for a screen reader: unnamed controls, the heading count, and the language a page claims to be in |
| `loop` | a page that will not sit still when nobody is touching it |

None of these is decoration. Between them they caught: a translator that
returned a fresh closure on every call, which made an effect re-run on every
render and the password generator rewrite itself 91,000 times a second; sliders
and switches with no name for a screen reader to say, because a `for` pointing
at nothing cancels the fallback that would have named them; and every Dutch
page declaring itself `<html lang="en">`, which is why the site now has a root
layout per language rather than one for all of them.

### Adding a language

An entry in `LOCALES` (`lib/i18n/locales.js`), then an `i18n` key on each tool
and a dictionary block. German is already listed as planned.

Slugs are translated too — `/nl/tools/pdf-samenvoegen` against
`/en/tools/merge-pdf` — because that is most of what a search engine reads, and
every page declares its alternates so the two versions do not compete.

The engines are shared: the e-mail tool is the MIME reader written for Mijn
Afspraken, and the calendar converter is its iCalendar reader plus the lenient
date reader that copes with `half elf` in a spreadsheet cell.

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

**Light, dark, or whatever the device says.** Like iOS: Automatisch / Licht /
Donker, under Weergave in the settings. The preference is resolved in
JavaScript, so the stylesheet needs one dark block keyed on `data-theme`
instead of two that must be kept in step, and a small script in the page
applies the stored choice before the first paint. An embed can be pinned with
`data-theme` to match its host page.

**Lets you delete, and lets you take it back.** What a delete means depends on
where the appointment came from, and the difference is respected rather than
papered over. Something typed here is really removed. Something from a
subscribed calendar cannot be — the next sync would return it — so it is
remembered as deleted, which keeps it gone *and* keeps it restorable under
**Verwijderd** in the settings. Either way it takes two taps, the confirmation
disarms itself after a few seconds, and the toast offers **Ongedaan maken**.
Edits survive a delete-and-restore round trip.

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
├── theme.js       light, dark, or follow the device
├── idb.js         attachment bytes
└── demo.js        the worked example

tests/            161 tests; import.test.mjs is the corpus of real mail shapes
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
