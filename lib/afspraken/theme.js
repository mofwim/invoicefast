/**
 * Light, dark, or whatever the device says.
 *
 * iOS offers Automatic / Light / Dark, and so does this. The preference is
 * resolved in JavaScript rather than in a media query, which means the
 * stylesheet needs exactly one dark block keyed on `data-theme="dark"` instead
 * of two that have to be kept in step. A tiny script in the document head
 * applies the stored choice before the first paint, so switching to dark never
 * flashes white.
 */

export const THEMES = [
  { value: "auto", label: "Automatisch" },
  { value: "light", label: "Licht" },
  { value: "dark", label: "Donker" },
];

export const DEFAULT_THEME = "auto";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Background colours the browser chrome should match. */
const CHROME = { light: "#f2f2f7", dark: "#000000" };

export function isTheme(value) {
  return THEMES.some((theme) => theme.value === value);
}

export function systemPrefersDark() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(DARK_QUERY).matches;
}

/**
 * Turn a preference into the scheme actually being shown.
 *
 * @param {string} preference     "auto" | "light" | "dark"
 * @param {boolean} [systemDark]  what the device reports; read live when omitted
 * @returns {"light"|"dark"}
 */
export function resolveTheme(preference, systemDark) {
  if (preference === "dark" || preference === "light") return preference;
  const dark = systemDark === undefined ? systemPrefersDark() : Boolean(systemDark);
  return dark ? "dark" : "light";
}

/** Paint the choice onto the document. Returns the scheme that ended up active. */
export function applyTheme(preference) {
  const scheme = resolveTheme(preference);
  if (typeof document === "undefined") return scheme;

  const root = document.documentElement;
  root.setAttribute("data-theme", scheme);
  // Tells the browser which way to render form controls and scrollbars.
  root.style.colorScheme = scheme;

  let meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", CHROME[scheme]);

  return scheme;
}

/** Call back whenever the device switches, so "Automatisch" keeps up. */
export function watchSystemTheme(onChange) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(DARK_QUERY);
  const handler = (event) => onChange(event.matches);

  if (query.addEventListener) {
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }
  // Safari before 14 only has the deprecated form.
  query.addListener(handler);
  return () => query.removeListener(handler);
}

/**
 * The pre-paint script, as source text.
 *
 * It reads the same storage key the app uses and must stay dependency-free and
 * synchronous — it runs before anything is rendered.
 */
export function themeBootScript(storageKey = "mijn_afspraken_v1", override = "") {
  // Reading storage is guarded on its own: unreadable settings must fall back
  // to following the device, not skip applying a theme altogether.
  return `(function(){
var p=${JSON.stringify(override)};
if(p!=="light"&&p!=="dark"&&p!=="auto"){p="auto";
try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)})||"{}");
if(s&&s.settings&&s.settings.theme)p=s.settings.theme;}catch(_){}}
try{
var d=p==="dark"||(p!=="light"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var e=document.documentElement;
e.setAttribute("data-theme",d?"dark":"light");
e.style.colorScheme=d?"dark":"light";
}catch(_){}})();`;
}
