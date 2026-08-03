/**
 * The market.
 *
 * One entry per tool, carrying its own words in every language it speaks. The
 * hub, the routing, the page titles and the search all read from here, so a
 * tool is described once and never drifts out of step with itself.
 *
 * Adding a tool: an entry below, plus a component in `components/tools/`.
 * Adding a language: another key under `i18n`. No route file either way.
 *
 * Every tool shares one promise — the work happens in the browser. `local`
 * records it per tool so the hub can state it as a fact rather than a slogan.
 */

import { DEFAULT_LOCALE, LOCALES } from "../i18n/locales";

/** Order here is the order the hub shows them in. */
export const CATEGORY_ORDER = [
  "afbeelding",
  "pdf",
  "tekst",
  "genereren",
  "bestanden",
  "agenda",
  "zakelijk",
];

export const TOOLS = [
  // ---------------------------------------------------------------- images
  {
    id: "compress-image",
    category: "afbeelding",
    icon: "image",
    tint: "pink",
    local: true,
    i18n: {
      nl: {
        slug: "afbeelding-comprimeren",
        name: "Afbeelding comprimeren",
        tagline: "Kleiner maken zonder dat je het ziet",
        description:
          "Maak een foto lichter zodat hij door een uploadlimiet past of een pagina sneller laadt. Je kiest een maximum en de kwaliteit zakt precies zo ver als nodig is.",
        intro:
          "Maak een foto lichter zodat hij door een uploadlimiet past of een pagina sneller laadt. Kies een maximum en de kwaliteit zakt precies zo ver als nodig is — niet verder.",
        keywords: ["foto verkleinen", "afbeelding comprimeren", "jpg kleiner maken", "bestandsgrootte verkleinen"],
      },
      en: {
        slug: "compress-image",
        name: "Compress image",
        tagline: "Smaller, without it showing",
        description:
          "Make a photo lighter so it fits an upload limit or loads faster on a page. You set a ceiling and quality drops only as far as it must.",
        intro:
          "Make a photo lighter so it fits an upload limit or loads faster on a page. Set a ceiling and quality drops exactly as far as it must — no further.",
        keywords: ["compress image", "reduce image size", "make jpg smaller", "shrink photo"],
      },
    },
  },
  {
    id: "convert-image",
    category: "afbeelding",
    icon: "shuffle",
    tint: "pink",
    local: true,
    i18n: {
      nl: {
        slug: "afbeelding-omzetten",
        name: "Afbeelding omzetten",
        tagline: "Tussen JPG, PNG en WebP",
        description:
          "Zet een afbeelding om naar een ander formaat. WebP voor het web, JPG voor waar alles het doet, PNG als je de transparantie nodig hebt.",
        intro:
          "WebP voor het web, JPG voor waar alles het doet, PNG als je de transparantie nodig hebt. Meerdere bestanden tegelijk mag.",
        keywords: ["png naar jpg", "webp maken", "afbeelding converteren", "heic omzetten"],
      },
      en: {
        slug: "convert-image",
        name: "Convert image",
        tagline: "Between JPG, PNG and WebP",
        description:
          "Change an image to another format. WebP for the web, JPG for where everything works, PNG when you need the transparency.",
        intro:
          "WebP for the web, JPG for where everything works, PNG when you need the transparency. Several files at once is fine.",
        keywords: ["png to jpg", "convert to webp", "image converter", "change image format"],
      },
    },
  },
  {
    id: "resize-image",
    category: "afbeelding",
    icon: "crop",
    tint: "purple",
    local: true,
    i18n: {
      nl: {
        slug: "afbeelding-formaat",
        name: "Formaat voor social media",
        tagline: "De juiste maat voor elk platform",
        description:
          "Schaal en snijd een afbeelding op de maat die Instagram, LinkedIn, YouTube of een Open Graph-kaart verwacht — zonder de maten op te hoeven zoeken.",
        intro:
          "Kies waar het heen gaat en de maat klopt: Instagram, LinkedIn, YouTube, een Open Graph-kaart. Geen maten opzoeken, geen uitgerekte foto's.",
        keywords: ["instagram formaat", "afbeelding bijsnijden", "social media maten", "thumbnail maken"],
      },
      en: {
        slug: "resize-image",
        name: "Resize for social media",
        tagline: "The right size for every platform",
        description:
          "Scale and crop an image to the size Instagram, LinkedIn, YouTube or an Open Graph card expects — without looking the numbers up.",
        intro:
          "Pick where it is going and the size is right: Instagram, LinkedIn, YouTube, an Open Graph card. No looking up dimensions, no stretched photos.",
        keywords: ["instagram size", "crop image", "social media dimensions", "make thumbnail"],
      },
    },
  },
  {
    id: "make-favicon",
    category: "afbeelding",
    icon: "sparkle",
    tint: "orange",
    local: true,
    i18n: {
      nl: {
        slug: "favicon-maken",
        name: "Favicon maken",
        tagline: "Eén afbeelding, alle maten",
        description:
          "Maak van een logo een complete set favicons plus het .ico-bestand, met de regels die je in je HTML plakt.",
        intro:
          "Eén logo erin, alle maten eruit — inclusief het .ico-bestand en de regels die je in je HTML plakt.",
        keywords: ["favicon maken", "ico bestand", "apple touch icon", "site icoon"],
      },
      en: {
        slug: "favicon-generator",
        name: "Favicon generator",
        tagline: "One image, every size",
        description:
          "Turn a logo into a complete set of favicons plus the .ico file, with the lines to paste into your HTML.",
        intro:
          "One logo in, every size out — including the .ico file and the lines to paste into your HTML.",
        keywords: ["favicon generator", "ico file", "apple touch icon", "site icon"],
      },
    },
  },
  {
    id: "watermark-image",
    category: "afbeelding",
    icon: "pencil",
    tint: "indigo",
    local: true,
    i18n: {
      nl: {
        slug: "watermerk",
        name: "Watermerk toevoegen",
        tagline: "Je naam over je foto",
        description:
          "Zet tekst over een afbeelding voordat je hem deelt. Plaats, grootte en doorzichtigheid kies je zelf.",
        intro:
          "Zet je naam over een foto voordat je hem deelt. De grootte schaalt mee met de afbeelding, dus het staat er net zo op een telefoonkiekje als op een camerabestand.",
        keywords: ["watermerk toevoegen", "copyright op foto", "tekst op afbeelding", "foto beschermen"],
      },
      en: {
        slug: "add-watermark",
        name: "Add watermark",
        tagline: "Your name across your photo",
        description:
          "Put text over an image before you share it. Position, size and transparency are yours to pick.",
        intro:
          "Put your name across a photo before you share it. The size scales with the picture, so it sits the same on a phone snap as on a camera file.",
        keywords: ["add watermark", "copyright photo", "text on image", "protect photo"],
      },
    },
  },

  // ------------------------------------------------------------------- pdf
  {
    id: "merge-pdf",
    category: "pdf",
    icon: "file",
    tint: "blue",
    local: true,
    i18n: {
      nl: {
        slug: "pdf-samenvoegen",
        name: "PDF samenvoegen",
        tagline: "Meerdere bestanden, één document",
        description:
          "Zet losse PDF's achter elkaar in één bestand. Sleep ze in de volgorde die je wilt; de tekst blijft tekst en de kwaliteit blijft zoals hij was.",
        intro:
          "Zet losse PDF's achter elkaar in één document. Je bepaalt de volgorde, en er wordt niets opnieuw getekend — de tekst blijft tekst en de scherpte blijft.",
        keywords: ["pdf samenvoegen", "pdf's combineren", "pdf bestanden samenvoegen", "meerdere pdf naar één"],
      },
      en: {
        slug: "merge-pdf",
        name: "Merge PDF",
        tagline: "Several files, one document",
        description:
          "Put separate PDFs one after another in a single file. Drag them into the order you want; text stays text and nothing is re-rendered.",
        intro:
          "Put separate PDFs one after another into a single document. You set the order, and nothing is redrawn — text stays text and the sharpness stays with it.",
        keywords: ["merge pdf", "combine pdf", "join pdf files", "pdf merger"],
      },
    },
  },
  {
    id: "split-pdf",
    category: "pdf",
    icon: "crop",
    tint: "blue",
    local: true,
    i18n: {
      nl: {
        slug: "pdf-splitsen",
        name: "PDF splitsen",
        tagline: "Haal er de pagina's uit die je nodig hebt",
        description:
          "Pak een paar pagina's uit een PDF, of hak een lang document in stukken van gelijke grootte. Je typt de pagina's zoals in een printvenster: 1-3, 7, 12-.",
        intro:
          "Pak er de pagina's uit die je nodig hebt, of hak een lang document in stukken. Pagina's typ je zoals in een printvenster: 1-3, 7, 12-.",
        keywords: ["pdf splitsen", "pagina uit pdf halen", "pdf opdelen", "pdf pagina's scheiden"],
      },
      en: {
        slug: "split-pdf",
        name: "Split PDF",
        tagline: "Take out the pages you need",
        description:
          "Pull a few pages out of a PDF, or chop a long document into equal parts. Type pages the way a print dialog expects: 1-3, 7, 12-.",
        intro:
          "Pull out the pages you need, or chop a long document into parts. Type pages the way a print dialog expects: 1-3, 7, 12-.",
        keywords: ["split pdf", "extract pdf pages", "separate pdf", "pdf splitter"],
      },
    },
  },
  {
    id: "organise-pdf",
    category: "pdf",
    icon: "shuffle",
    tint: "indigo",
    local: true,
    i18n: {
      nl: {
        slug: "pdf-pagina-s-ordenen",
        name: "PDF-pagina's ordenen",
        tagline: "Draaien en weggooien",
        description:
          "Zet scheve pagina's rechtop en gooi de lege of dubbele eruit. Je ziet elke pagina als een tegel en werkt erop.",
        intro:
          "Zet scheve pagina's rechtop en gooi eruit wat je niet wilt. Elke pagina staat als een tegel voor je; wat je aanwijst verandert meteen.",
        keywords: ["pdf pagina draaien", "pdf pagina verwijderen", "pdf roteren", "pdf pagina's ordenen"],
      },
      en: {
        slug: "rotate-delete-pdf-pages",
        name: "Rotate and delete PDF pages",
        tagline: "Turn them upright, throw the rest out",
        description:
          "Set sideways pages straight and drop the blank or duplicate ones. Every page sits in front of you as a tile.",
        intro:
          "Set sideways pages upright and throw out what you do not want. Every page sits in front of you as a tile; what you touch changes at once.",
        keywords: ["rotate pdf pages", "delete pdf pages", "reorganise pdf", "remove page from pdf"],
      },
    },
  },
  {
    id: "images-to-pdf",
    category: "pdf",
    icon: "image",
    tint: "purple",
    local: true,
    i18n: {
      nl: {
        slug: "afbeeldingen-naar-pdf",
        name: "Afbeeldingen naar PDF",
        tagline: "Foto's als één document",
        description:
          "Maak van losse foto's of scans één PDF om te mailen of te archiveren — één afbeelding per pagina, netjes gecentreerd.",
        intro:
          "Maak van losse foto's of scans één PDF om te versturen of te bewaren. Eén afbeelding per pagina, netjes gecentreerd op A4 of precies op maat.",
        keywords: ["jpg naar pdf", "foto naar pdf", "afbeeldingen naar pdf", "scan naar pdf"],
      },
      en: {
        slug: "images-to-pdf",
        name: "Images to PDF",
        tagline: "Photos as one document",
        description:
          "Turn loose photos or scans into a single PDF to e-mail or file away — one image per page, neatly centred.",
        intro:
          "Turn loose photos or scans into one PDF to send or keep. One image per page, centred on A4 or cut exactly to size.",
        keywords: ["jpg to pdf", "photo to pdf", "images to pdf", "scan to pdf"],
      },
    },
  },
  {
    id: "stamp-pdf",
    category: "pdf",
    icon: "pencil",
    tint: "orange",
    local: true,
    i18n: {
      nl: {
        slug: "pdf-watermerk",
        name: "Watermerk op PDF",
        tagline: "Kopie, concept, of paginanummers",
        description:
          "Zet een woord schuin over elke pagina — KOPIE, CONCEPT, je eigen naam — en nummer de pagina's terwijl je toch bezig bent.",
        intro:
          "Zet een woord schuin over elke pagina — KOPIE, CONCEPT, je eigen naam — en nummer meteen de pagina's als je dat wilt.",
        keywords: ["watermerk pdf", "pdf paginanummers", "concept stempel pdf", "kopie op pdf"],
      },
      en: {
        slug: "watermark-pdf",
        name: "Watermark a PDF",
        tagline: "Copy, draft, or page numbers",
        description:
          "Put a word diagonally across every page — COPY, DRAFT, your own name — and number the pages while you are there.",
        intro:
          "Put a word diagonally across every page — COPY, DRAFT, your own name — and number the pages at the same time if you want.",
        keywords: ["watermark pdf", "pdf page numbers", "draft stamp pdf", "add text to pdf"],
      },
    },
  },

  {
    id: "pdf-to-images",
    category: "pdf",
    icon: "image",
    tint: "teal",
    local: true,
    i18n: {
      nl: {
        slug: "pdf-naar-afbeelding",
        name: "PDF naar afbeelding",
        tagline: "Elke pagina als JPG of PNG",
        description:
          "Zet de pagina's van een PDF om naar losse afbeeldingen, in de resolutie die je nodig hebt — 72 dpi voor op een scherm, 300 voor drukwerk. Alles komt terug als één zip.",
        intro:
          "Elke pagina als losse afbeelding, in de resolutie die je nodig hebt. Voor een pagina die in een presentatie moet, of een scan waar je één blad uit wilt. Alles komt terug als één zip.",
        keywords: ["pdf naar jpg", "pdf naar png", "pdf naar afbeelding", "pdf pagina als plaatje"],
      },
      en: {
        slug: "pdf-to-jpg",
        name: "PDF to JPG",
        tagline: "Every page as a JPG or PNG",
        description:
          "Turn the pages of a PDF into separate images at whatever resolution you need — 72 dpi for a screen, 300 for print. Everything comes back as one zip.",
        intro:
          "Every page as its own image, at the resolution you need. For a page that has to go in a slide, or a scan you want one sheet out of. Everything comes back as one zip.",
        keywords: ["pdf to jpg", "pdf to png", "pdf to image", "convert pdf page to picture"],
      },
    },
  },
  {
    id: "extract-images",
    category: "pdf",
    icon: "crop",
    tint: "orange",
    local: true,
    i18n: {
      nl: {
        slug: "afbeeldingen-uit-pdf",
        name: "Afbeeldingen uit een PDF",
        tagline: "De foto's eruit, op hun eigen resolutie",
        description:
          "Haal de foto's en logo's uit een PDF zoals ze erin zitten — niet de pagina als plaatje, maar de afbeelding zelf, op de resolutie waarmee hij erin ging.",
        intro:
          "Niet de pagina als plaatje, maar de afbeeldingen zelf: de foto's en logo's zoals ze in het document zitten, op hun eigen resolutie. Alles samen in één zip.",
        keywords: ["afbeelding uit pdf", "foto uit pdf halen", "pdf afbeeldingen extraheren", "plaatjes uit pdf"],
      },
      en: {
        slug: "extract-images-from-pdf",
        name: "Extract images from a PDF",
        tagline: "The photos out, at their own resolution",
        description:
          "Pull the photos and logos out of a PDF as they sit inside it — not the page as a picture, but the image itself, at the resolution it went in at.",
        intro:
          "Not the page as a picture, but the images themselves: the photos and logos as they sit in the document, at their own resolution. All of them in one zip.",
        keywords: ["extract images from pdf", "get pictures out of pdf", "pdf image extractor", "save pdf photos"],
      },
    },
  },
  {
    id: "pdf-to-text",
    category: "pdf",
    icon: "code",
    tint: "indigo",
    local: true,
    i18n: {
      nl: {
        slug: "pdf-naar-tekst",
        name: "PDF naar tekst",
        tagline: "De woorden eruit, zonder de opmaak",
        description:
          "Haal de tekst uit een PDF om hem te kunnen doorzoeken, citeren of ergens anders plakken. De regels blijven staan waar ze stonden.",
        intro:
          "Haal de tekst uit een PDF om te doorzoeken, citeren of ergens anders te plakken. De regelovergangen blijven staan waar ze stonden — geen muur van tekst.",
        keywords: ["pdf naar tekst", "tekst uit pdf halen", "pdf kopiëren", "pdf naar txt"],
      },
      en: {
        slug: "pdf-to-text",
        name: "PDF to text",
        tagline: "The words out, without the layout",
        description:
          "Pull the text out of a PDF so you can search it, quote it, or paste it somewhere else. The line breaks stay where they were.",
        intro:
          "Pull the text out of a PDF to search, quote or paste somewhere else. Line breaks stay where they were — not one wall of text.",
        keywords: ["pdf to text", "extract text from pdf", "copy text from pdf", "pdf to txt"],
      },
    },
  },
  {
    id: "compress-pdf",
    category: "pdf",
    icon: "crop",
    tint: "pink",
    local: true,
    i18n: {
      nl: {
        slug: "pdf-verkleinen",
        name: "PDF verkleinen",
        tagline: "Door de bijlagelimiet heen",
        description:
          "Maak een PDF lichter. Eerst netjes: opnieuw opslaan zonder ook maar iets aan de pagina's te veranderen. Helpt dat niet genoeg, dan de zware manier — en er staat precies bij wat je daarmee inlevert.",
        intro:
          "Twee manieren, allebei eerlijk benoemd. Netjes opnieuw opslaan verandert niets aan de pagina's. De zware manier tekent ze opnieuw als afbeelding: veel kleiner, maar de tekst is dan geen tekst meer.",
        keywords: ["pdf verkleinen", "pdf comprimeren", "pdf kleiner maken", "pdf bestandsgrootte"],
      },
      en: {
        slug: "compress-pdf",
        name: "Compress PDF",
        tagline: "Through the attachment limit",
        description:
          "Make a PDF lighter. The clean way first: re-saved without changing a single page. If that is not enough, the heavy way — and exactly what you give up is written on the page.",
        intro:
          "Two ways, both stated plainly. Re-saving cleanly changes nothing about the pages. The heavy way redraws them as pictures: far smaller, but the text stops being text.",
        keywords: ["compress pdf", "reduce pdf size", "make pdf smaller", "shrink pdf"],
      },
    },
  },
  {
    id: "pdf-metadata",
    category: "pdf",
    icon: "settings",
    tint: "purple",
    local: true,
    i18n: {
      nl: {
        slug: "pdf-eigenschappen",
        name: "PDF-eigenschappen",
        tagline: "Titel, auteur — en wat je liever weghaalt",
        description:
          "Bekijk en wijzig wat een PDF over zichzelf vertelt: titel, auteur, onderwerp, trefwoorden. Ook handig om je naam eruit te halen voordat je hem doorstuurt.",
        intro:
          "Bekijk en wijzig wat een PDF over zichzelf vertelt. Een document draagt vaak nog de naam van wie het maakte en de software die het uitspuugde — hier haal je dat er in één klik uit.",
        keywords: ["pdf eigenschappen", "pdf metadata", "pdf auteur wijzigen", "pdf titel aanpassen"],
      },
      en: {
        slug: "pdf-metadata-editor",
        name: "PDF metadata editor",
        tagline: "Title, author — and what you would rather remove",
        description:
          "See and change what a PDF says about itself: title, author, subject, keywords. Also the way to take your name out before you forward it.",
        intro:
          "See and change what a PDF says about itself. A document usually still carries the name of whoever made it and the software that produced it — one click takes that out.",
        keywords: ["pdf metadata", "edit pdf properties", "change pdf author", "remove pdf metadata"],
      },
    },
  },
  {
    id: "sign-pdf",
    category: "pdf",
    icon: "pencil",
    tint: "blue",
    local: true,
    i18n: {
      nl: {
        slug: "pdf-ondertekenen",
        name: "PDF ondertekenen",
        tagline: "Zet je handtekening waar hij hoort",
        description:
          "Teken je handtekening met de muis of je vinger, of zet er een foto van neer, en klik op de plek waar hij moet komen. Het contract gaat nergens heen.",
        intro:
          "Teken met je muis of je vinger — of zet er een foto van je handtekening neer — en klik op de pagina waar hij moet staan. Een contract dat je moet tekenen is precies het soort document dat je niet naar een onbekende server stuurt.",
        keywords: ["pdf ondertekenen", "handtekening pdf", "digitaal ondertekenen", "pdf tekenen"],
      },
      en: {
        slug: "sign-pdf",
        name: "Sign a PDF",
        tagline: "Put your signature where it belongs",
        description:
          "Draw your signature with a mouse or a finger, or drop a picture of it, then click where it should go. The contract goes nowhere.",
        intro:
          "Draw with your mouse or your finger — or drop in a picture of your signature — then click the page where it should sit. A contract you have to sign is exactly the kind of document you do not send to a stranger's server.",
        keywords: ["sign pdf", "pdf signature", "esign pdf free", "add signature to pdf"],
      },
    },
  },

  // ------------------------------------------------------------ text & code
  {
    id: "arabic-text",
    category: "tekst",
    icon: "pencil",
    tint: "teal",
    local: true,
    i18n: {
      nl: {
        slug: "arabische-tekst-repareren",
        name: "Arabische tekst repareren",
        tagline: "Arabisch dat niet breekt in CapCut of Photoshop",
        description:
          "CapCut, Blender en Photoshop zonder de Midden-Oostenmotor tekenen Arabisch achterstevoren met losse letters. Plak je tekst en kopieer een versie die wél goed wordt weergegeven.",
        intro:
          "CapCut, DaVinci Resolve en Photoshop zonder de Midden-Oostenmotor tekenen Arabisch achterstevoren, met elke letter los van de volgende. Plak je tekst hier en kopieer een versie die wel klopt.",
        keywords: ["arabische tekst capcut", "arabisch omgekeerd photoshop", "arabische letters los", "arabische tekst repareren"],
      },
      en: {
        slug: "fix-arabic-text",
        name: "Fix Arabic text",
        tagline: "Arabic that survives CapCut and Photoshop",
        description:
          "CapCut, Blender and Photoshop without the Middle Eastern text engine draw Arabic backwards with every letter detached. Paste your text and copy out a version that renders correctly.",
        intro:
          "CapCut, DaVinci Resolve and Photoshop without the Middle Eastern text engine draw Arabic backwards, with every letter cut off from the next. Paste your text here and copy out a version that comes out right.",
        keywords: ["arabic text capcut", "arabic reversed photoshop", "arabic letters not connecting", "fix arabic text", "arabic premiere pro"],
      },
      ar: {
        slug: "islah-al-nass-al-arabi",
        name: "إصلاح النص العربي",
        tagline: "عربية لا تنكسر في كاب كات أو فوتوشوب",
        description:
          "كاب كات وبليندر وفوتوشوب بلا محرّك نصوص الشرق الأوسط ترسم العربية بالمقلوب وبحروف متقطعة. الصق نصك وانسخ نسخة تظهر صحيحة.",
        intro:
          "كاب كات ودافنشي ريزولف وفوتوشوب بلا محرّك نصوص الشرق الأوسط ترسم العربية بالمقلوب، وكل حرف مقطوع عمّا بعده. الصق نصك هنا وانسخ نسخة تخرج صحيحة.",
        keywords: ["النص العربي كاب كات", "العربية مقلوبة فوتوشوب", "الحروف العربية متقطعة", "اصلاح النص العربي", "العربية بريمير برو"],
      },
    },
    notes: [
      {
        nl: {
          head: "Waarom Arabisch breekt",
          body: "Arabisch is een verbonden schrift: elke letter heeft tot vier vormen, afhankelijk van wat ernaast staat, en het loopt van rechts naar links. Een goede tekstmotor rekent dat uit op het moment van tekenen. CapCut, Blender en de oudere Adobe-versies doen dat niet — die tekenen elk teken in zijn losse vorm, van links naar rechts. Deze tool doet dat werk vooraf.",
        },
        en: {
          head: "Why Arabic breaks",
          body: "Arabic is a joined script: each letter takes up to four shapes depending on its neighbours, and it runs right to left. A proper text renderer works that out at the moment it draws. CapCut, Blender and the older Adobe builds do not — they draw each character in its standalone shape, left to right. This tool does that work in advance.",
        },
        ar: {
          head: "لماذا تنكسر العربية",
          body: "العربية خط متّصل: يأخذ كل حرف حتى أربعة أشكال بحسب ما يجاوره، والكتابة تسير من اليمين إلى اليسار. المحرّك النصّي السليم يحسب ذلك لحظة الرسم. أما كاب كات وبليندر وإصدارات أدوبي القديمة فلا تفعل — ترسم كل رمز بشكله المنفرد من اليسار إلى اليمين. هذه الأداة تؤدي ذلك العمل مسبقاً.",
        },
      },
      {
        nl: {
          head: "Werkt het ook voor Perzisch, Urdu en Koerdisch?",
          body: "Ja. De lettertabel bevat پ چ ژ گ ک ی ٹ ں ھ ہ ے naast de Arabische letters, dus Perzisch, Urdu, Koerdisch en Pasjtoe worden ook goed verbonden.",
        },
        en: {
          head: "Does it work for Persian, Urdu and Kurdish?",
          body: "Yes. The letter table covers پ چ ژ گ ک ی ٹ ں ھ ہ ے alongside the Arabic set, so Persian, Urdu, Kurdish and Pashto all join correctly.",
        },
        ar: {
          head: "هل تعمل مع الفارسية والأردية والكردية؟",
          body: "نعم. يشمل جدول الحروف پ چ ژ گ ک ی ٹ ں ھ ہ ے إلى جانب الحروف العربية، فتُوصَل الفارسية والأردية والكردية والباشتو بشكل صحيح.",
        },
      },
      {
        nl: {
          head: "De tekst komt gespiegeld eruit",
          body: "Dan zet je programma de richting zelf al goed, en keert deze tool hem een tweede keer om. Zet 'Richting omkeren' uit en laat 'Letters verbinden' aan.",
        },
        en: {
          head: "The text came out mirrored",
          body: "Then your app handles direction on its own and this tool reversed it a second time. Switch off 'Flip the direction' and leave 'Join the letters' on.",
        },
        ar: {
          head: "ظهر النص معكوساً",
          body: "معناه أن برنامجك يتولى الاتجاه بنفسه، فعكسته الأداة مرة ثانية. أوقف «عكس الاتجاه» وأبقِ «وصل الحروف» مفعّلاً.",
        },
      },
      {
        nl: {
          head: "Kan ik het voor ondertitels gebruiken?",
          body: "Voor ondertitels die je in een montageprogramma intypt: ja. Voor een .srt-bestand: wees voorzichtig — de meeste spelers zetten Arabisch zelf goed neer, dus een gerepareerd bestand komt er dubbel omgekeerd uit. Repareer alleen als je de speler het echt fout ziet doen.",
        },
        en: {
          head: "Can I use it for subtitles?",
          body: "For captions you type into an editor, yes. For an .srt file, be careful: most players handle Arabic correctly on their own, so a fixed file would come out doubly reversed. Only fix it if you can see the player getting it wrong.",
        },
        ar: {
          head: "هل أستخدمها للترجمة؟",
          body: "للترجمة التي تكتبها داخل برنامج المونتاج، نعم. أما لملف ‎.srt‎ فكن حذراً: أغلب المشغّلات تتعامل مع العربية بشكل صحيح، فالملف المُصلَح سيظهر معكوساً مرتين. لا تُصلح إلا إذا رأيت المشغّل يخطئ فعلاً.",
        },
      },
    ],
  },
  {
    id: "word-count",
    category: "tekst",
    icon: "pencil",
    tint: "teal",
    local: true,
    i18n: {
      nl: {
        slug: "woorden-tellen",
        name: "Woorden tellen",
        tagline: "Woorden, tekens en leestijd",
        description:
          "Tel woorden, tekens, zinnen en alinea's terwijl je typt of plakt, met de leestijd erbij. Handig voor een opdracht met een limiet, een meta-omschrijving of een bericht dat ergens in moet passen.",
        intro:
          "Tel woorden, tekens, zinnen en alinea's terwijl je typt, met de leestijd erbij. De veelgebruikte limieten staan ernaast, dus je ziet meteen of het past.",
        keywords: ["woorden tellen", "tekens tellen", "karakters tellen", "leestijd berekenen"],
      },
      en: {
        slug: "word-counter",
        name: "Word counter",
        tagline: "Words, characters and reading time",
        description:
          "Count words, characters, sentences and paragraphs as you type or paste, with the reading time alongside. For an assignment with a limit, a meta description, or a post that has to fit.",
        intro:
          "Count words, characters, sentences and paragraphs as you type, with the reading time alongside. The usual limits sit next to it, so you can see at once whether it fits.",
        keywords: ["word counter", "character count", "letter count", "reading time"],
      },
    },
  },
  {
    id: "json-format",
    category: "tekst",
    icon: "code",
    tint: "indigo",
    local: true,
    i18n: {
      nl: {
        slug: "json-opmaken",
        name: "JSON opmaken",
        tagline: "Inspringen, controleren, of juist samenpersen",
        description:
          "Maak JSON leesbaar met nette inspringing, of pers het weer samen tot één regel. Klopt er iets niet, dan krijg je de regel en het teken waar het misgaat — niet alleen 'ongeldig'.",
        intro:
          "Plak JSON en lees het terug met nette inspringing — of pers het samen tot één regel. Klopt er iets niet, dan wijst hij de regel en het teken aan waar het misgaat.",
        keywords: ["json formatter", "json opmaken", "json controleren", "json valideren"],
      },
      en: {
        slug: "json-formatter",
        name: "JSON formatter",
        tagline: "Indent it, check it, or squeeze it flat",
        description:
          "Make JSON readable with proper indentation, or squeeze it back into one line. When something is wrong you get the line and the character it goes wrong at — not just 'invalid'.",
        intro:
          "Paste JSON and read it back properly indented — or squeeze it into a single line. When something is wrong it points at the line and the character, not just at the document.",
        keywords: ["json formatter", "json beautifier", "json validator", "format json online"],
      },
    },
  },
  {
    id: "base64",
    category: "tekst",
    icon: "repeat",
    tint: "blue",
    local: true,
    i18n: {
      nl: {
        slug: "base64-coderen",
        name: "Base64 coderen",
        tagline: "Tekst en bestanden heen en terug",
        description:
          "Zet tekst om naar base64 en weer terug, of maak van een klein bestand een data-URI die je zo in je CSS of HTML plakt. De URL-veilige variant zit erbij.",
        intro:
          "Tekst naar base64 en weer terug, met de URL-veilige variant erbij. Sleep je een bestand hierheen, dan krijg je de data-URI die je in je CSS of HTML plakt.",
        keywords: ["base64 encode", "base64 decode", "data uri maken", "base64 omzetten"],
      },
      en: {
        slug: "base64-encode-decode",
        name: "Base64 encoder",
        tagline: "Text and files, both directions",
        description:
          "Turn text into base64 and back, or turn a small file into a data URI you can paste straight into your CSS or HTML. The URL-safe alphabet is there too.",
        intro:
          "Text into base64 and back, with the URL-safe alphabet alongside. Drop a file on it and you get the data URI to paste into your CSS or HTML.",
        keywords: ["base64 encode", "base64 decode", "data uri generator", "base64 converter"],
      },
    },
  },
  {
    id: "text-diff",
    category: "tekst",
    icon: "shuffle",
    tint: "purple",
    local: true,
    i18n: {
      nl: {
        slug: "tekst-vergelijken",
        name: "Tekst vergelijken",
        tagline: "Zie wat er tussen twee versies veranderd is",
        description:
          "Zet twee versies naast elkaar en zie regel voor regel wat erbij kwam en wat wegviel. Voor een contract dat terugkwam met wijzigingen, of twee configuraties die net niet hetzelfde doen.",
        intro:
          "Zet twee versies naast elkaar en zie regel voor regel wat erbij kwam en wat wegviel — een contract dat terugkwam met wijzigingen, twee configuraties die net niet hetzelfde doen.",
        keywords: ["tekst vergelijken", "verschil tussen teksten", "diff tool", "twee bestanden vergelijken"],
      },
      en: {
        slug: "compare-text",
        name: "Compare text",
        tagline: "See what changed between two versions",
        description:
          "Put two versions side by side and see line by line what was added and what went. For a contract that came back with changes, or two configurations that behave differently.",
        intro:
          "Put two versions side by side and see line by line what was added and what went — a contract that came back with changes, two configurations that behave differently.",
        keywords: ["compare text", "text diff", "diff checker", "compare two files"],
      },
    },
  },
  {
    id: "slug-url",
    category: "tekst",
    icon: "link",
    tint: "orange",
    local: true,
    i18n: {
      nl: {
        slug: "slug-maken",
        name: "Slug maken",
        tagline: "Van een titel naar een nette URL",
        description:
          "Maak van een titel een schone URL-slug: accenten worden gewone letters, ß wordt ss, en € wordt eur. De tab ernaast doet URL-codering heen en terug.",
        intro:
          "Van een titel naar een nette URL. Accenten worden gewone letters, ß wordt ss, € wordt eur — en de tab ernaast doet URL-codering heen en terug.",
        keywords: ["slug maken", "url slug generator", "url encoderen", "permalink maken"],
      },
      en: {
        slug: "slug-generator",
        name: "Slug generator",
        tagline: "From a title to a clean URL",
        description:
          "Turn a title into a clean URL slug: accents become plain letters, ß becomes ss, € becomes eur. The tab next to it does URL encoding both ways.",
        intro:
          "From a title to a clean URL. Accents become plain letters, ß becomes ss, € becomes eur — and the tab next to it does URL encoding both ways.",
        keywords: ["slug generator", "url slug", "url encode", "permalink generator"],
      },
    },
  },

  // ------------------------------------------------------------- generators
  {
    id: "qr-code",
    category: "genereren",
    icon: "sparkle",
    tint: "indigo",
    local: true,
    i18n: {
      nl: {
        slug: "qr-code-maken",
        name: "QR-code maken",
        tagline: "Voor een link, je wifi, of je gegevens",
        description:
          "Maak een QR-code voor een link, je wifi-netwerk, een telefoonnummer of een stuk tekst. Scherp als PNG of als SVG, in de kleur die je zelf kiest.",
        intro:
          "Een QR-code voor een link, je wifi, een telefoonnummer of gewoon tekst. Hij wordt hier gemaakt en nergens geregistreerd — dus hij blijft werken, ook als deze site morgen verdwijnt.",
        keywords: ["qr code maken", "qr code generator", "wifi qr code", "gratis qr code"],
      },
      en: {
        slug: "qr-code-generator",
        name: "QR code generator",
        tagline: "For a link, your wifi, or your details",
        description:
          "Make a QR code for a link, your wifi network, a phone number or a piece of text. Sharp as PNG or as SVG, in whatever colour you pick.",
        intro:
          "A QR code for a link, your wifi, a phone number or plain text. It is made here and registered nowhere — so it keeps working even if this site disappears tomorrow.",
        keywords: ["qr code generator", "free qr code", "wifi qr code", "make qr code"],
      },
    },
  },
  {
    id: "password",
    category: "genereren",
    icon: "lock",
    tint: "pink",
    local: true,
    i18n: {
      nl: {
        slug: "wachtwoord-maken",
        name: "Wachtwoord maken",
        tagline: "Sterk, en nooit over het internet gegaan",
        description:
          "Maak sterke wachtwoorden met de generator van je eigen browser. Je kiest de lengte en de tekensoorten; de sterkte staat er in bits bij.",
        intro:
          "Sterke wachtwoorden uit de generator van je eigen browser. Ze worden hier gemaakt en nergens heen gestuurd — een wachtwoord dat een server heeft gezien, is er een die je niet meer moet gebruiken.",
        keywords: ["wachtwoord generator", "sterk wachtwoord maken", "random wachtwoord", "veilig wachtwoord"],
      },
      en: {
        slug: "password-generator",
        name: "Password generator",
        tagline: "Strong, and never sent anywhere",
        description:
          "Make strong passwords with your own browser's generator. You pick the length and the character types; the strength is shown in bits.",
        intro:
          "Strong passwords from your own browser's generator. They are made here and sent nowhere — a password a server has seen is one you should not be using.",
        keywords: ["password generator", "strong password", "random password", "secure password"],
      },
    },
  },
  {
    id: "hash",
    category: "genereren",
    icon: "hash",
    tint: "blue",
    local: true,
    i18n: {
      nl: {
        slug: "checksum-controleren",
        name: "Checksum controleren",
        tagline: "MD5, SHA-1, SHA-256 en SHA-512",
        description:
          "Bereken de checksum van een bestand of een stuk tekst, en vergelijk hem met wat de downloadpagina opgeeft. Het bestand blijft op je apparaat, dus ook een groot bestand hoeft nergens heen.",
        intro:
          "Bereken de checksum van een bestand of tekst en vergelijk hem met wat er opgegeven staat. Plak de verwachte waarde erbij en je krijgt gewoon te horen of het klopt.",
        keywords: ["md5 checksum", "sha256 berekenen", "bestand controleren", "hash generator"],
      },
      en: {
        slug: "checksum-calculator",
        name: "Checksum calculator",
        tagline: "MD5, SHA-1, SHA-256 and SHA-512",
        description:
          "Work out the checksum of a file or a piece of text and compare it with what the download page says. The file stays on your device, so even a large one goes nowhere.",
        intro:
          "Work out the checksum of a file or some text and compare it with the published one. Paste in the expected value and you simply get told whether it matches.",
        keywords: ["md5 checksum", "sha256 calculator", "verify file hash", "hash generator"],
      },
    },
  },

  // ----------------------------------------------------------------- files
  {
    id: "unpack-email",
    category: "bestanden",
    icon: "mail",
    tint: "indigo",
    local: true,
    i18n: {
      nl: {
        slug: "email-uitpakken",
        name: "E-mail uitpakken",
        tagline: "Open een .eml en haal de bijlagen eruit",
        description:
          "Sleep een opgeslagen e-mail hierheen en zie wat erin zit: afzender, tekst, en elke bijlage om los op te slaan. Handig voor een mailtje dat je uit een archief hebt en niet meer kunt openen.",
        intro:
          "Sleep een opgeslagen e-mail hierheen en zie wat erin zit: de tekst, een eventuele uitnodiging, en elke bijlage om los op te slaan.",
        keywords: ["eml openen", "bijlage uit e-mail", "eml bestand lezen", "outlook bericht openen"],
      },
      en: {
        slug: "open-eml-file",
        name: "Open an .eml file",
        tagline: "Read a saved e-mail and pull out its attachments",
        description:
          "Drop a saved e-mail here and see what is inside: sender, text, and every attachment to save on its own. For the mail out of an archive that nothing will open.",
        intro:
          "Drop a saved e-mail here and see what is inside: the text, any invitation it carries, and every attachment to save on its own.",
        keywords: ["open eml file", "extract email attachment", "eml viewer", "read outlook message"],
      },
    },
  },

  // -------------------------------------------------------------- calendar
  {
    id: "convert-calendar",
    category: "agenda",
    icon: "calendar",
    tint: "teal",
    local: true,
    i18n: {
      nl: {
        slug: "agenda-omzetten",
        name: "Agenda omzetten",
        tagline: "ICS naar een tabel, en terug",
        description:
          "Zet een agendabestand om naar CSV om het in Excel te bekijken, of maak van een tabel een agendabestand dat je in Google, Outlook of Apple Agenda importeert.",
        intro:
          "Een agendabestand naar een tabel om in Excel te bekijken, of een tabel naar een agendabestand om te importeren in Google, Outlook of Apple Agenda.",
        keywords: ["ics naar csv", "csv naar ics", "agenda importeren", "afspraken in excel"],
      },
      en: {
        slug: "ics-to-csv",
        name: "ICS to CSV, and back",
        tagline: "A calendar in a spreadsheet",
        description:
          "Turn a calendar file into CSV to read it in Excel, or turn a table into a calendar file you can import into Google, Outlook or Apple Calendar.",
        intro:
          "A calendar file into a table to read in Excel, or a table into a calendar file to import into Google, Outlook or Apple Calendar.",
        keywords: ["ics to csv", "csv to ics", "calendar to excel", "import calendar"],
      },
    },
  },

  // -------------------------------------------------------------- business
  {
    id: "vat-calculator",
    category: "zakelijk",
    icon: "scale",
    tint: "teal",
    local: true,
    i18n: {
      nl: {
        slug: "btw-berekenen",
        name: "Btw berekenen",
        tagline: "Van bedrag naar bedrag, beide kanten op",
        description:
          "Reken btw erbij of eraf, met de tarieven van Nederland, België en de buurlanden. Je typt één bedrag en ziet exclusief, btw en inclusief tegelijk.",
        intro:
          "Reken btw erbij of eraf. Typ één bedrag en je ziet exclusief, btw en inclusief tegelijk — afgerond zoals op een factuur, dus de drie tellen ook echt op.",
        keywords: ["btw berekenen", "btw calculator", "21 procent btw", "btw eruit rekenen"],
      },
      en: {
        slug: "vat-calculator",
        name: "VAT calculator",
        tagline: "Add it or take it out, both directions",
        description:
          "Add VAT or take it back out, with the rates for the Netherlands, Belgium, Germany, the UK and more. Type one amount and see net, VAT and gross at once.",
        intro:
          "Add VAT or take it back out. Type one amount and see net, VAT and gross at once — rounded the way an invoice rounds, so the three actually add up.",
        keywords: ["vat calculator", "add vat", "remove vat", "vat reverse calculator"],
      },
    },
  },
  {
    id: "iban-check",
    category: "zakelijk",
    icon: "bank",
    tint: "purple",
    local: true,
    i18n: {
      nl: {
        slug: "iban-controleren",
        name: "IBAN controleren",
        tagline: "Voordat je het geld overmaakt",
        description:
          "Controleer of een IBAN klopt: lengte per land en de officiële 97-controle. Bij een Nederlands nummer zie je er meteen bij van welke bank het is.",
        intro:
          "Controleer of een IBAN klopt voordat je betaalt — lengte per land plus de officiële 97-controle. Bij een Nederlands nummer staat de bank erbij. Het nummer blijft in je browser.",
        keywords: ["iban controleren", "iban check", "rekeningnummer controleren", "iban validatie"],
      },
      en: {
        slug: "iban-validator",
        name: "IBAN validator",
        tagline: "Before you send the money",
        description:
          "Check whether an IBAN is right: the length for its country and the official mod-97 check. A Dutch number also tells you which bank it belongs to.",
        intro:
          "Check an IBAN before you pay — the length for its country plus the official mod-97 check. A Dutch number names its bank too. The number stays in your browser.",
        keywords: ["iban validator", "check iban", "verify bank account", "iban checker"],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/** A tool flattened into one language, or null when it does not speak it. */
export function localise(tool, locale) {
  const content = tool.i18n?.[locale];
  if (!content) return null;
  return {
    id: tool.id,
    category: tool.category,
    icon: tool.icon,
    tint: tool.tint,
    local: tool.local !== false,
    locale,
    href: `/${locale}/tools/${content.slug}`,
    // Longer prose, when a tool has some. Rendered by the shell on the server
    // rather than inside the tool, so it is in the HTML a crawler reads — the
    // tools themselves load lazily and arrive too late for that.
    notes: (tool.notes || []).map((note) => note[locale]).filter(Boolean),
    ...content,
  };
}

export function toolsForLocale(locale) {
  return TOOLS.map((tool) => localise(tool, locale)).filter(Boolean);
}

export function findTool(locale, slug) {
  for (const tool of TOOLS) {
    if (tool.i18n?.[locale]?.slug === slug) return localise(tool, locale);
  }
  return null;
}

export function findToolById(id, locale) {
  const tool = TOOLS.find((entry) => entry.id === id);
  return tool ? localise(tool, locale) || localise(tool, DEFAULT_LOCALE) : null;
}

/** Every (locale, slug) pair, for pre-rendering the whole market. */
export function allToolRoutes() {
  const routes = [];
  for (const locale of LOCALES) {
    for (const tool of TOOLS) {
      const content = tool.i18n?.[locale];
      if (content) routes.push({ locale, slug: content.slug });
    }
  }
  return routes;
}

/** The same tool in the other languages, for hreflang. */
export function alternatesFor(id) {
  const tool = TOOLS.find((entry) => entry.id === id);
  if (!tool) return {};
  const out = {};
  for (const locale of LOCALES) {
    const content = tool.i18n?.[locale];
    if (content) out[locale] = `/${locale}/tools/${content.slug}`;
  }
  return out;
}

export function categoriesForLocale(locale) {
  const tools = toolsForLocale(locale);
  return CATEGORY_ORDER.map((id) => ({ id, tools: tools.filter((tool) => tool.category === id) })).filter(
    (group) => group.tools.length > 0
  );
}

/** Others in the same category — what to read next at the bottom of a page. */
export function relatedTools(tool, locale, limit = 3) {
  return toolsForLocale(locale)
    .filter((entry) => entry.category === tool.category && entry.id !== tool.id)
    .slice(0, limit);
}
