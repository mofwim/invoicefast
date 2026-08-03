import Icon from "../afspraken/Icons";
import { toolsByCategory } from "../../lib/tools/registry";
import { STORAGE_KEY } from "../../lib/afspraken/store";
import { themeBootScript } from "../../lib/afspraken/theme";
import "./tools.css";

export const metadata = {
  title: "Tools — kleine hulpmiddelen die in je browser draaien",
  description:
    "Een verzameling kleine tools die hun werk in je eigen browser doen: afspraken bijhouden, e-mails uitpakken, agenda's omzetten, facturen maken. Geen account, geen upload.",
  keywords:
    "online tools, gratis tools, browser tools, privacy, geen upload, ics csv, eml openen, factuur",
  icons: { icon: "/afspraken-icon.svg" },
  openGraph: {
    title: "Tools",
    description: "Kleine hulpmiddelen die hun werk in je eigen browser doen.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2f2f7",
};

export default function ToolsPage() {
  const groups = toolsByCategory();

  return (
    <div className="tp-page">
      <script dangerouslySetInnerHTML={{ __html: themeBootScript(STORAGE_KEY) }} />
      <div className="tp">
        <h1 className="tp-title">Tools</h1>
        <p className="tp-sub">
          Kleine hulpmiddelen die hun werk in je eigen browser doen. Geen account, geen upload,
          geen wachtrij — je bestand blijft op je apparaat.
        </p>

        {groups.map((group) => (
          <section className="tp-group" key={group.id}>
            <h2>{group.label}</h2>
            <div className="tp-cards">
              {group.tools.map((tool) => (
                <a className="tp-card" href={tool.href} key={tool.slug}>
                  <span className="tp-card-top">
                    <span className="tp-badge" data-tint={tool.tint} aria-hidden="true">
                      <Icon name={tool.icon} size={21} strokeWidth={1.9} />
                    </span>
                    <span className="tp-card-name">
                      <strong>{tool.name}</strong>
                      <span>{tool.tagline}</span>
                    </span>
                  </span>
                  <p>{tool.description}</p>
                  {tool.local && (
                    <span className="tp-card-foot">
                      <Icon name="check" size={13} strokeWidth={2.4} />
                      Draait op je eigen apparaat
                    </span>
                  )}
                </a>
              ))}
            </div>
          </section>
        ))}

        <p className="tp-privacy">
          <Icon name="check" size={15} strokeWidth={2.2} />
          <span>
            Alles hier draait in de browser zelf. Er gaat geen bestand naar een server, er is geen
            account nodig en er wordt niets bewaard buiten je eigen apparaat.
          </span>
        </p>
      </div>
    </div>
  );
}
