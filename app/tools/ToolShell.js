import Icon from "../afspraken/Icons";
import { STORAGE_KEY } from "../../lib/afspraken/store";
import { themeBootScript } from "../../lib/afspraken/theme";
import "./tools.css";

/**
 * The frame every tool sits in: back to the market, a title, and the promise
 * spelled out at the bottom of the page rather than asserted in a banner.
 *
 * The appearance follows whatever was chosen in Mijn Afspraken — same storage,
 * same pre-paint script — so the market does not flip between light and dark
 * as you move between tools.
 */
export default function ToolShell({ title, tagline, children }) {
  return (
    <div className="tp-page">
      <script dangerouslySetInnerHTML={{ __html: themeBootScript(STORAGE_KEY) }} />
      <div className="tp tp-tool">
        <nav className="tp-nav">
          <a className="tp-back" href="/tools">
            <Icon name="chevron" size={17} strokeWidth={2.4} className="tp-back-icon" />
            Alle tools
          </a>
        </nav>

        <h1 className="tp-title">{title}</h1>
        {tagline && <p className="tp-sub">{tagline}</p>}

        {children}

        <p className="tp-privacy">
          <Icon name="check" size={15} strokeWidth={2.2} />
          <span>
            Dit gebeurt allemaal in je browser. Je bestand wordt niet geüpload, nergens bewaard en
            door niemand gelezen — sluit je het tabblad, dan is het weg.
          </span>
        </p>

        <p className="tp-foot">
          <a href="/tools">Alle tools</a>
        </p>
      </div>
    </div>
  );
}
