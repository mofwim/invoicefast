/**
 * What a tool says when something goes wrong.
 *
 * The engines here are language-agnostic and the market is not: the same
 * failure has to read as Dutch on `/nl` and as English on `/en`. So an engine
 * raises a *code* and the numbers that belong to it, and the page it happened
 * on does the wording. A message written into the library would be right in one
 * language and wrong in the other.
 */
export class ToolError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "ToolError";
    this.code = code;
    this.details = details;
  }
}

export const fail = (code, details) => {
  throw new ToolError(code, details);
};

/**
 * Turn whatever was thrown into a sentence in this page's language.
 *
 * Anything without a code is shown as it came — a browser's own message about
 * a broken file is more use than a shrug, even untranslated.
 */
export function describeError(t, err) {
  if (err?.code && typeof t === "function") {
    const text = t(`err.${err.code}`, err.details);
    if (text !== `err.${err.code}`) return text;
  }
  return String(err?.message || err || "");
}
