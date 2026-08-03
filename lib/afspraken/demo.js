/**
 * A worked example, so the app is never a blank page.
 *
 * Times are generated relative to the moment it is opened, which means the
 * three tabs and the whole urgency range are visible straight away: something
 * running now, something later today, next week, next month, and a trail of
 * past appointments.
 */

const MINUTE = 60000;
const HOUR = 3600000;
const DAY = 86400000;

function at(now, offsetDays, hour, minute = 0) {
  const d = new Date(now + offsetDays * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

/**
 * Real bytes, so the example also demonstrates that papers travel with an
 * appointment and can genuinely be opened again later.
 */
function note(name, body) {
  const bytes = new TextEncoder().encode(body);
  return { name, mime: "text/plain;charset=utf-8", size: bytes.length, bytes, kind: "file" };
}

export function demoEvents(now = Date.now()) {
  const soon = now + 90 * MINUTE;

  return [
    {
      id: "demo-live",
      uid: "demo-live@mijn-afspraken",
      title: "Wekelijkse teamstand-up",
      start: now - 8 * MINUTE,
      end: now + 22 * MINUTE,
      location: "Online",
      meetingUrl: "https://meet.google.com/voorbeeld-afspraak",
      description: "Korte doorloop van de week. Neem je updates mee.",
      organizer: { name: "Sanne de Groot", email: "sanne@voorbeeld.nl", role: "organisator" },
      people: [
        { name: "Sanne de Groot", email: "sanne@voorbeeld.nl", role: "organisator", status: "ACCEPTED" },
        { name: "Youssef Bakker", email: "youssef@voorbeeld.nl", role: "deelnemer", status: "ACCEPTED" },
        { name: "Lieke Visser", email: "lieke@voorbeeld.nl", role: "deelnemer", status: "TENTATIVE" },
      ],
      isSeries: true,
      confidence: 1,
      origin: "agenda",
    },
    {
      id: "demo-tandarts",
      uid: "demo-tandarts@mijn-afspraken",
      title: "Tandarts — halfjaarlijkse controle",
      start: soon,
      end: soon + 30 * MINUTE,
      location: "Tandartspraktijk Vondelpark, Vondelstraat 84, 1054 GN Amsterdam",
      description:
        "Kom 5 minuten eerder. Neem je verzekeringspas en identiteitsbewijs mee.\nVerzetten kan kosteloos tot 24 uur van tevoren via 020-1234567.",
      organizer: { name: "Praktijk Vondelpark", email: "balie@tandartsvondelpark.nl", role: "organisator" },
      people: [{ name: "Dr. M. Jansen", email: "", role: "behandelaar" }],
      attachments: [
        note(
          "afspraakbevestiging.txt",
          "Bevestiging van uw afspraak\n\nTandartspraktijk Vondelpark\nVondelstraat 84, 1054 GN Amsterdam\n\nHalfjaarlijkse controle.\nNeem uw verzekeringspas mee.\n"
        ),
      ],
      confidence: 0.92,
      origin: "e-mail",
      emailSubject: "Bevestiging van uw afspraak",
    },
    {
      id: "demo-ouderavond",
      uid: "demo-ouderavond@mijn-afspraken",
      title: "Ouderavond groep 6",
      start: at(now, 3, 19, 30),
      end: at(now, 3, 21, 0),
      location: "Basisschool De Regenboog, Kerkstraat 3, 3512 JK Utrecht",
      description: "Aula, tweede verdieping. Koffie vanaf 19:15.",
      people: [{ name: "Juf Karin", email: "k.smit@deregenboog.nl", role: "deelnemer" }],
      confidence: 1,
      origin: "agenda",
    },
    {
      // Deliberately overlapping the parents' evening, so the clash warning is
      // visible in the example rather than only described.
      id: "demo-cursus",
      uid: "demo-cursus@mijn-afspraken",
      title: "Online cursus Spaans — les 4",
      start: at(now, 3, 20, 0),
      end: at(now, 3, 21, 0),
      location: "Online",
      meetingUrl: "https://zoom.us/j/voorbeeld",
      confidence: 1,
      origin: "agenda",
    },
    {
      id: "demo-apk",
      uid: "demo-apk@mijn-afspraken",
      title: "APK-keuring auto",
      start: at(now, 6, 8, 30),
      end: at(now, 6, 10, 0),
      location: "Garage Van Dijk, Industrieweg 22, 3542 AD Utrecht",
      description: "Sleutel inleveren bij de balie. Klaar rond 12:00.",
      confidence: 0.78,
      origin: "e-mail",
      emailSubject: "Uw APK-afspraak",
    },
    {
      id: "demo-gemeente",
      uid: "demo-gemeente@mijn-afspraken",
      title: "Paspoort ophalen — gemeente",
      start: at(now, 19, 11, 15),
      end: at(now, 19, 11, 30),
      location: "Stadskantoor, Stadsplateau 1, 3521 AZ Utrecht",
      description: "Neem het afhaalbewijs en je oude paspoort mee.",
      attachments: [
        note(
          "afhaalbewijs.txt",
          "Afhaalbewijs paspoort\n\nGemeente Utrecht — Stadskantoor\nStadsplateau 1, 3521 AZ Utrecht\n\nNeem dit bewijs en uw oude paspoort mee.\n"
        ),
      ],
      confidence: 1,
      origin: "agenda",
    },
    {
      id: "demo-verjaardag",
      uid: "demo-verjaardag@mijn-afspraken",
      title: "Verjaardag Nour",
      start: at(now, 34, 0),
      end: at(now, 35, 0),
      allDay: true,
      confidence: 1,
      origin: "agenda",
    },
    {
      id: "demo-review",
      uid: "demo-review@mijn-afspraken",
      title: "Jaargesprek met leidinggevende",
      start: at(now, 47, 14, 0),
      end: at(now, 47, 15, 0),
      location: "Kantoor Amsterdam, kamer 3.14",
      people: [{ name: "Sanne de Groot", email: "sanne@voorbeeld.nl", role: "organisator" }],
      confidence: 1,
      origin: "agenda",
    },
    {
      id: "demo-fysio",
      uid: "demo-fysio@mijn-afspraken",
      title: "Fysiotherapie — vervolgafspraak",
      start: at(now, -2, 16, 0),
      end: at(now, -2, 16, 45),
      location: "Fysio Centrum, Nachtegaalstraat 9, 3581 AC Utrecht",
      people: [{ name: "R. Hoekstra", email: "", role: "behandelaar" }],
      confidence: 1,
      origin: "agenda",
    },
    {
      id: "demo-bank",
      uid: "demo-bank@mijn-afspraken",
      title: "Adviesgesprek hypotheek",
      start: at(now, -9, 10, 0),
      end: at(now, -9, 11, 0),
      location: "Online",
      meetingUrl: "https://teams.microsoft.com/l/meetup-join/voorbeeld",
      confidence: 1,
      origin: "agenda",
    },
    {
      id: "demo-geannuleerd",
      uid: "demo-geannuleerd@mijn-afspraken",
      title: "Workshop projectplanning",
      start: at(now, 9, 13, 0),
      end: at(now, 9, 17, 0),
      location: "Leerhuis, Zaal B",
      status: "CANCELLED",
      description: "Geannuleerd door de organisator wegens te weinig aanmeldingen.",
      confidence: 1,
      origin: "agenda",
    },
  ];
}
