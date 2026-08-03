import CopyBlock from "./CopyBlock";
import Bootstrap from "../Bootstrap";
import "../afspraken.css";
import "./insluiten.css";

export const metadata = {
  title: "Mijn Afspraken insluiten op je eigen site",
  description:
    "Zet het afsprakenoverzicht met één scriptregel op je eigen website, intranet of klantportaal. Het past zich aan de hoogte van de lijst aan en werkt overal.",
  icons: { icon: "/afspraken-icon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const SNIPPET = `<script src="https://jouw-domein.nl/embed.js"
        data-mijn-afspraken
        data-tab="binnenkort"
        data-height="540"></script>`;

const WITH_CALENDAR = `<script src="https://jouw-domein.nl/embed.js"
        data-mijn-afspraken
        data-ics="https://calendar.google.com/calendar/ical/…/basic.ics"
        data-target="#afspraken"></script>`;

const OPTIONS = [
  ["data-tab", "Welk tabblad open staat: voorbij, binnenkort of later.", "binnenkort"],
  ["data-ics", "Een agenda-link die meteen geladen wordt.", "leeg"],
  ["data-height", "Beginhoogte in pixels; daarna groeit hij mee.", "540"],
  ["data-target", "CSS-selector van het element waarin hij moet komen.", "naast het script"],
  ["data-origin", "Waar de widget gehost wordt.", "de herkomst van het script"],
];

export default function InsluitenPage() {
  return (
    <div className="ma-page">
      <Bootstrap serviceWorker={false} />
      <div className="ma ma-doc">
        <header className="ma-doc-head">
          <p className="ma-doc-eyebrow">
            <a href="/afspraken">← Mijn Afspraken</a>
          </p>
          <h1>Op je eigen site</h1>
          <p>
            Eén scriptregel en het overzicht staat er — op je website, je intranet of in een
            klantportaal. Het draait in een eigen frame, dus het botst nooit met je eigen opmaak, en
            het groeit mee met de lijst.
          </p>
        </header>

        <section className="ma-doc-section">
          <h2>De snelste manier</h2>
          <CopyBlock code={SNIPPET} />
          <p className="ma-doc-note">
            Vervang <code>jouw-domein.nl</code> door het adres waar deze app draait.
          </p>
        </section>

        <section className="ma-doc-section">
          <h2>Meteen met een agenda erin</h2>
          <p>
            Zonder <code>data-ics</code> begint de widget leeg en kiest de bezoeker zelf een bron.
            Geef je er een agenda-link bij, dan staat de lijst er direct — handig voor een
            teamagenda, een spreekuur of een openingsrooster.
          </p>
          <CopyBlock code={WITH_CALENDAR} />
        </section>

        <section className="ma-doc-section">
          <h2>Instellingen</h2>
          <div className="ma-doc-table-wrap">
            <table className="ma-doc-table">
              <thead>
                <tr>
                  <th>Attribuut</th>
                  <th>Wat het doet</th>
                  <th>Standaard</th>
                </tr>
              </thead>
              <tbody>
                {OPTIONS.map(([name, what, fallback]) => (
                  <tr key={name}>
                    <td><code>{name}</code></td>
                    <td>{what}</td>
                    <td className="ma-doc-default">{fallback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ma-doc-section">
          <h2>Zo ziet het eruit</h2>
          <div className="ma-doc-preview">
            <iframe
              src="/embed/afspraken?tab=binnenkort"
              title="Voorbeeld van de ingesloten widget"
              loading="lazy"
            />
          </div>
        </section>

        <section className="ma-doc-section">
          <h2>Goed om te weten</h2>
          <ul className="ma-doc-list">
            <li>
              <strong>De gegevens blijven bij de bezoeker.</strong> Afspraken staan in de browser van
              wie kijkt, niet op een server. Jij ziet ze niet.
            </li>
            <li>
              <strong>Een ingesloten widget heeft eigen opslag.</strong> Browsers houden opslag in een
              frame gescheiden van de site zelf, dus wat iemand op{" "}
              <a href="/afspraken">de volledige pagina</a> toevoegt staat niet automatisch in de
              widget. Gebruik <code>data-ics</code> als je zeker wilt weten dat er meteen iets staat.
            </li>
            <li>
              <strong>Alleen agenda-links gaan over het net.</strong> Die worden opgehaald via een
              eigen proxy, omdat browsers dat rechtstreeks blokkeren. Er wordt niets bewaard.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
