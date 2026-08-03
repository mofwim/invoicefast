import Icon from "../Icons";
import { STORAGE_KEY } from "../../lib/afspraken/store";
import { themeBootScript } from "../../lib/afspraken/theme";
import { translator } from "../../lib/i18n/ui";
import ConsentGate from "../ads/Consent";
import "./tools.css";

/**
 * What actually happens, in plain words.
 *
 * Written as facts a reader can check rather than as a policy: every claim
 * below is either visible in the network tab or visible in the source. A page
 * that says "we value your privacy" and then lists eleven partners is worse
 * than no page at all; this one is short because there is genuinely little to
 * report.
 */
const TEXT = {
  nl: {
    title: "Privacy",
    intro:
      "Kort, omdat er weinig te melden valt. Hieronder staat precies wat er gebeurt — niet wat er zou mogen gebeuren.",
    sections: [
      {
        head: "Je bestanden",
        body: [
          "Elke tool op deze site doet zijn werk in je eigen browser. Je bestand wordt niet geüpload, niet doorgestuurd en niet bewaard. Er is geen server die het te zien krijgt, dus er is ook geen server die het kan lekken.",
          "Je kunt dit zelf nakijken: open het netwerktabblad van je browser en gebruik een tool. Er gaat geen enkel verzoek uit met je bestand erin.",
          "Sluit je het tabblad, dan is alles weg. Er is niets om later te verwijderen.",
        ],
      },
      {
        head: "Wat er wél wordt bewaard",
        body: [
          "Alleen in je eigen browser, en alleen wat je zelf hebt ingesteld: je keuze voor licht of donker, je taal, en je antwoord op de advertentievraag. Dat staat in de opslag van je browser en gaat nergens heen.",
          "In Mijn Afspraken staan daarnaast je afspraken en hun bijlagen — ook alleen op je eigen apparaat. De enige uitzondering is een agendalink die je zelf toevoegt: die wordt opgehaald via deze site, omdat een browser dat niet rechtstreeks mag. Dat verzoek bewaart niets.",
        ],
      },
      {
        head: "Advertenties",
        body: [
          "Er wordt niets van een advertentienetwerk geladen totdat je hebt gekozen. Geen script, geen pixel, geen verzoek. Kies je 'geen advertenties', dan hoort Google nooit van je bestaan op deze site.",
          "Kies je wel advertenties, dan wordt Google AdSense geladen. Google zet dan cookies en ziet je IP-adres en welke pagina je bekijkt — zoals elke advertentie op elke site. Wat Google niet ziet: je bestand, wat je ermee doet, of dat je een tool hebt gebruikt.",
          "'Zonder personalisatie' betekent dat de advertentie bij de pagina wordt gekozen en niet bij jou. Er wordt dan nog steeds een cookie gezet om herhaling te voorkomen.",
          "Je keuze kun je op elke pagina onderaan wijzigen of intrekken, net zo makkelijk als je hem hebt gegeven.",
        ],
      },
      {
        head: "Meten",
        body: ["Er is geen analytics. Geen Google Analytics, geen alternatief, geen tellertje."],
      },
      {
        head: "Je rechten",
        body: [
          "Er worden geen persoonsgegevens over je verwerkt buiten wat hierboven staat, dus er is niets om in te zien of te laten verwijderen — er is niets van je opgeslagen op een server. Wat in je browser staat, wis je zelf door de sitegegevens te wissen.",
        ],
      },
    ],
    back: "Alle tools",
  },
  en: {
    title: "Privacy",
    intro:
      "Short, because there is little to report. Below is exactly what happens — not what would be permitted to happen.",
    sections: [
      {
        head: "Your files",
        body: [
          "Every tool on this site does its work in your own browser. Your file is not uploaded, not forwarded and not stored. There is no server that ever sees it, so there is no server that can leak it.",
          "You can check this yourself: open your browser's network tab and use a tool. Not one request goes out with your file in it.",
          "Close the tab and it is all gone. There is nothing left to delete later.",
        ],
      },
      {
        head: "What is stored",
        body: [
          "Only in your own browser, and only what you set yourself: light or dark, your language, and your answer to the advertising question. That sits in your browser's storage and goes nowhere.",
          "Mijn Afspraken additionally holds your appointments and their attachments — again only on your own device. The one exception is a calendar link you add yourself: that is fetched through this site, because a browser is not allowed to fetch it directly. That request stores nothing.",
        ],
      },
      {
        head: "Advertising",
        body: [
          "Nothing from an ad network is loaded until you have chosen. No script, no pixel, no request. Choose 'no advertising' and Google never hears that you exist on this site.",
          "If you do choose advertising, Google AdSense is loaded. Google then sets cookies and sees your IP address and which page you are on — as any advertisement on any site does. What Google does not see: your file, what you did with it, or that you used a tool at all.",
          "'Without personalisation' means the advertisement is chosen from the page rather than from you. A cookie is still set, to stop it repeating itself.",
          "Your choice can be changed or withdrawn at the foot of any page, as easily as it was given.",
        ],
      },
      {
        head: "Measurement",
        body: ["There is no analytics. No Google Analytics, no alternative, no counter."],
      },
      {
        head: "Your rights",
        body: [
          "No personal data about you is processed beyond what is described above, so there is nothing to request access to or have erased — nothing of yours is held on a server. What sits in your browser, you clear yourself by clearing the site data.",
        ],
      },
    ],
    back: "All tools",
  },
};

export default function Privacy({ locale = "nl" }) {
  const t = translator(locale);
  const words = TEXT[locale] || TEXT.nl;

  return (
    <div className="tp-page">
      <script dangerouslySetInnerHTML={{ __html: themeBootScript(STORAGE_KEY) }} />
      <div className="tp tp-tool">
        <nav className="tp-nav">
          <a className="tp-back" href={`/${locale}/tools`}>
            <Icon name="chevron" size={17} strokeWidth={2.4} className="tp-back-icon" />
            {words.back}
          </a>
        </nav>

        <h1 className="tp-title">{words.title}</h1>
        <p className="tp-sub">{words.intro}</p>

        {words.sections.map((section) => (
          <section className="tp-panel" key={section.head}>
            <h3>{section.head}</h3>
            {section.body.map((line) => (
              <p className="tp-prose" key={line.slice(0, 32)}>
                {line}
              </p>
            ))}
          </section>
        ))}

        <p className="tp-foot">
          <a href={`/${locale}/tools`}>{t("market.all")}</a>
        </p>
        <ConsentGate locale={locale} />
      </div>
    </div>
  );
}
