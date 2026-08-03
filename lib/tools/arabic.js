/**
 * Arabic, drawn by something that does not know Arabic.
 *
 * Arabic is a cursive script: every letter takes one of up to four shapes
 * depending on what sits either side of it, and it runs right to left. A
 * proper text renderer works all of that out at the moment it draws — you hand
 * it plain letters and it decides the shapes and the order.
 *
 * CapCut, DaVinci Resolve, Blender, and Photoshop or After Effects without the
 * Middle Eastern text engine do none of that. They draw each code point in its
 * standalone shape, left to right, in file order. The result reads backwards
 * with every letter cut off from its neighbour.
 *
 * So this does the renderer's job in advance: each letter is swapped for its
 * correct contextual form from the Unicode Arabic Presentation Forms block,
 * lam-alef is fused into the single ligature it has to be, and the visual
 * order is reversed — while Latin words, links and numbers keep running left
 * to right and brackets are mirrored so they still point the right way. A
 * renderer that knows nothing about Arabic then produces the right picture by
 * accident.
 *
 * The engine came in as a patch against an older shape of this repo. Its logic
 * is carried across unchanged, because its tests are the specification and
 * restyling working code is how correct code stops being correct.
 */

/* --------------------------------------------------------------------------
   Form table: char -> [isolated, final, initial, medial]
   Two-entry rows are the non-connecting letters — they never take an initial
   or medial form, which is why د ر و ا leave a visible gap after them.
   -------------------------------------------------------------------------- */
const AR_FORMS = {
  'ء': ['ﺀ'],                                       // ء hamza
  'آ': ['ﺁ', 'ﺂ'],                             // آ alef madda
  'أ': ['ﺃ', 'ﺄ'],                             // أ alef hamza above
  'ؤ': ['ﺅ', 'ﺆ'],                             // ؤ waw hamza
  'إ': ['ﺇ', 'ﺈ'],                             // إ alef hamza below
  'ئ': ['ﺉ', 'ﺊ', 'ﺋ', 'ﺌ'],         // ئ yeh hamza
  'ا': ['ﺍ', 'ﺎ'],                             // ا alef
  'ب': ['ﺏ', 'ﺐ', 'ﺑ', 'ﺒ'],         // ب beh
  'ة': ['ﺓ', 'ﺔ'],                             // ة teh marbuta
  'ت': ['ﺕ', 'ﺖ', 'ﺗ', 'ﺘ'],         // ت teh
  'ث': ['ﺙ', 'ﺚ', 'ﺛ', 'ﺜ'],         // ث theh
  'ج': ['ﺝ', 'ﺞ', 'ﺟ', 'ﺠ'],         // ج jeem
  'ح': ['ﺡ', 'ﺢ', 'ﺣ', 'ﺤ'],         // ح hah
  'خ': ['ﺥ', 'ﺦ', 'ﺧ', 'ﺨ'],         // خ khah
  'د': ['ﺩ', 'ﺪ'],                             // د dal
  'ذ': ['ﺫ', 'ﺬ'],                             // ذ thal
  'ر': ['ﺭ', 'ﺮ'],                             // ر reh
  'ز': ['ﺯ', 'ﺰ'],                             // ز zain
  'س': ['ﺱ', 'ﺲ', 'ﺳ', 'ﺴ'],         // س seen
  'ش': ['ﺵ', 'ﺶ', 'ﺷ', 'ﺸ'],         // ش sheen
  'ص': ['ﺹ', 'ﺺ', 'ﺻ', 'ﺼ'],         // ص sad
  'ض': ['ﺽ', 'ﺾ', 'ﺿ', 'ﻀ'],         // ض dad
  'ط': ['ﻁ', 'ﻂ', 'ﻃ', 'ﻄ'],         // ط tah
  'ظ': ['ﻅ', 'ﻆ', 'ﻇ', 'ﻈ'],         // ظ zah
  'ع': ['ﻉ', 'ﻊ', 'ﻋ', 'ﻌ'],         // ع ain
  'غ': ['ﻍ', 'ﻎ', 'ﻏ', 'ﻐ'],         // غ ghain
  'ـ': ['ـ', 'ـ', 'ـ', 'ـ'],         // ـ tatweel
  'ف': ['ﻑ', 'ﻒ', 'ﻓ', 'ﻔ'],         // ف feh
  'ق': ['ﻕ', 'ﻖ', 'ﻗ', 'ﻘ'],         // ق qaf
  'ك': ['ﻙ', 'ﻚ', 'ﻛ', 'ﻜ'],         // ك kaf
  'ل': ['ﻝ', 'ﻞ', 'ﻟ', 'ﻠ'],         // ل lam
  'م': ['ﻡ', 'ﻢ', 'ﻣ', 'ﻤ'],         // م meem
  'ن': ['ﻥ', 'ﻦ', 'ﻧ', 'ﻨ'],         // ن noon
  'ه': ['ﻩ', 'ﻪ', 'ﻫ', 'ﻬ'],         // ه heh
  'و': ['ﻭ', 'ﻮ'],                             // و waw
  'ى': ['ﻯ', 'ﻰ'],                             // ى alef maksura
  'ي': ['ﻱ', 'ﻲ', 'ﻳ', 'ﻴ'],         // ي yeh
  'ٱ': ['ﭐ', 'ﭑ'],                             // ٱ alef wasla
  'ٹ': ['ﭦ', 'ﭧ', 'ﭨ', 'ﭩ'],         // ٹ tteh (Urdu)
  'پ': ['ﭖ', 'ﭗ', 'ﭘ', 'ﭙ'],         // پ peh (Persian)
  'چ': ['ﭺ', 'ﭻ', 'ﭼ', 'ﭽ'],         // چ tcheh
  'ژ': ['ﮊ', 'ﮋ'],                             // ژ jeh
  'ک': ['ﮎ', 'ﮏ', 'ﮐ', 'ﮑ'],         // ک keheh
  'گ': ['ﮒ', 'ﮓ', 'ﮔ', 'ﮕ'],         // گ gaf
  'ں': ['ﮞ', 'ﮟ'],                             // ں noon ghunna
  'ھ': ['ﮪ', 'ﮫ', 'ﮬ', 'ﮭ'],         // ھ heh doachashmee
  'ہ': ['ﮦ', 'ﮧ', 'ﮨ', 'ﮩ'],         // ہ heh goal
  'ی': ['ﯼ', 'ﯽ', 'ﯾ', 'ﯿ'],         // ی farsi yeh
  'ے': ['ﮮ', 'ﮯ']                              // ے yeh barree
};

/* Lam + Alef is a mandatory ligature — لا is one glyph, never two. */
const LAM_ALEF = {
  'آ': ['ﻵ', 'ﻶ'],  // لآ
  'أ': ['ﻷ', 'ﻸ'],  // لأ
  'إ': ['ﻹ', 'ﻺ'],  // لإ
  'ا': ['ﻻ', 'ﻼ']   // لا
};

/* Harakat and other combining marks. Invisible to the joining algorithm:
   a letter joins straight through them to its real neighbour. */
const IS_MARK = c => {
  const k = c.codePointAt(0);
  return (k >= 0x064B && k <= 0x065F) || k === 0x0670 ||
         (k >= 0x06D6 && k <= 0x06ED) || (k >= 0x0610 && k <= 0x061A) ||
         k === 0x0653 || k === 0x0654 || k === 0x0655;
};

const JOINS_FORWARD  = c => AR_FORMS[c] && AR_FORMS[c].length === 4;
const JOINS_BACKWARD = c => AR_FORMS[c] && AR_FORMS[c].length >= 2;
const IS_ARABIC      = c => !!AR_FORMS[c] || IS_MARK(c);

/* Brackets and slashes reverse their meaning when a line is flipped. */
const MIRROR = { '(':')', ')':'(', '[':']', ']':'[', '{':'}', '}':'{',
                 '<':'>', '>':'<', '«':'»', '»':'«', '‹':'›', '›':'‹' };

/* Presentation forms -> standard code points. Used to UN-break text that
   someone already ran through a shaper (or copied out of a broken PDF). */
const UNSHAPE = (() => {
  const m = {};
  for (const [base, forms] of Object.entries(AR_FORMS)) {
    if (base === 'ـ') continue;
    forms.forEach(f => { m[f] = base; });
  }
  for (const [alef, forms] of Object.entries(LAM_ALEF)) {
    forms.forEach(f => { m[f] = 'ل' + alef; });
  }
  return m;
})();

/* --------------------------------------------------------------------------
   shapeArabic(text)
   Replaces each letter with its correct contextual form and fuses lam-alef.
   Does not reorder anything.
   -------------------------------------------------------------------------- */
export function shapeArabic(text) {
  const chars = Array.from(text);
  const out = [];
  let i = 0;

  // Look backwards past marks for the previous real letter.
  const prevLetter = idx => {
    for (let j = idx - 1; j >= 0; j--) {
      if (IS_MARK(chars[j])) continue;
      return chars[j];
    }
    return null;
  };
  // Look forwards past marks for the next real letter.
  const nextLetter = idx => {
    for (let j = idx + 1; j < chars.length; j++) {
      if (IS_MARK(chars[j])) continue;
      return chars[j];
    }
    return null;
  };
  const nextIndex = idx => {
    for (let j = idx + 1; j < chars.length; j++) {
      if (!IS_MARK(chars[j])) return j;
    }
    return -1;
  };

  while (i < chars.length) {
    const c = chars[i];

    if (IS_MARK(c)) { out.push(c); i++; continue; }
    if (!AR_FORMS[c]) { out.push(c); i++; continue; }

    // Lam-alef ligature takes priority over normal shaping.
    if (c === 'ل') {
      const ni = nextIndex(i);
      const nc = ni === -1 ? null : chars[ni];
      if (nc && LAM_ALEF[nc]) {
        const p = prevLetter(i);
        const connected = p ? JOINS_FORWARD(p) : false;
        out.push(LAM_ALEF[nc][connected ? 1 : 0]);
        // carry any marks that sat between the lam and the alef
        for (let j = i + 1; j < ni; j++) out.push(chars[j]);
        i = ni + 1;
        continue;
      }
    }

    const forms = AR_FORMS[c];
    const p = prevLetter(i);
    const n = nextLetter(i);

    const linkPrev = !!(p && JOINS_FORWARD(p) && JOINS_BACKWARD(c));
    const linkNext = !!(n && JOINS_FORWARD(c) && JOINS_BACKWARD(n));

    let form;
    if (linkPrev && linkNext)       form = 3;   // medial
    else if (!linkPrev && linkNext) form = 2;   // initial
    else if (linkPrev && !linkNext) form = 1;   // final
    else                            form = 0;   // isolated

    out.push(forms[form] !== undefined ? forms[form] : forms[0]);
    i++;
  }
  return out.join('');
}

/* --------------------------------------------------------------------------
   reverseBidi(text)
   Flips the visual order of each line while keeping Latin words, numbers and
   URLs running left-to-right, and mirroring brackets. This is a deliberately
   simplified UBA: it handles the cases real captions actually contain.
   -------------------------------------------------------------------------- */
export function reverseBidi(text) {
  // Digits are read left-to-right even inside Arabic — ١٢ is twelve, not
  // twenty-one — so Arabic-Indic (U+0660..0669) and Persian (U+06F0..06F9)
  // numerals belong in this class alongside the Latin ones. Leaving them out
  // silently reverses every number the moment someone switches digit style.
  const LTR_RUN = /[A-Za-z0-9٠-٩۰-۹@#$%&*_+=~^\/\\.\-:;'"]+/;

  // Three kinds of run: 'ltr' (Latin words, numbers, URLs), 'rtl' (Arabic),
  // and 'ws' (whitespace). Whitespace is its own token so that reversing the
  // token order preserves the gaps exactly instead of drifting.
  const kindOf = ch => /\s/.test(ch) ? 'ws' : (LTR_RUN.test(ch) ? 'ltr' : 'rtl');

  return text.split('\n').map(line => {
    const tokens = [];
    let buf = '';
    let kind = null;

    for (const ch of Array.from(line)) {
      const k = kindOf(ch);
      if (k === kind) { buf += ch; continue; }
      if (buf !== '') tokens.push({ text: buf, kind });
      kind = k;
      buf = ch;
    }
    if (buf !== '') tokens.push({ text: buf, kind });

    return tokens.reverse().map(t => {
      if (t.kind !== 'rtl') return t.text;             // Latin and gaps pass through
      return Array.from(t.text).reverse()
        .map(c => MIRROR[c] || c).join('');
    }).join('');
  }).join('\n');
}

/* --------------------------------------------------------------------------
   Normalisation helpers
   -------------------------------------------------------------------------- */
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function unshapeArabic(text) {
  return Array.from(text).map(c => UNSHAPE[c] !== undefined ? UNSHAPE[c] : c).join('');
}
export function stripTashkeel(text) {
  return Array.from(text).filter(c => !IS_MARK(c)).join('');
}
export function stripTatweel(text) {
  return text.replace(/ـ+/g, '');
}
export function toLatinDigits(text) {
  return Array.from(text).map(c => {
    const a = AR_DIGITS.indexOf(c); if (a > -1) return String(a);
    const f = FA_DIGITS.indexOf(c); if (f > -1) return String(f);
    return c;
  }).join('');
}
export function toArabicDigits(text) {
  return text.replace(/[0-9]/g, d => AR_DIGITS[+d]);
}
/* Collapses the spelling variants that split search results and break
   find-and-replace: أإآ -> ا, ى -> ي, ة -> ه, ٱ -> ا */
export function normalizeLetters(text) {
  return text
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ی]/g, 'ي')
    .replace(/[ک]/g, 'ك');
}

export function hasArabic(text) {
  return /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(text);
}
/* True when the text is already in presentation forms — i.e. someone pasted
   text that has been shaped before. Re-shaping it would be a no-op or worse. */
export function isAlreadyShaped(text) {
  return /[ﭐ-﷿ﹰ-﻿]/.test(text);
}

/* --------------------------------------------------------------------------
   fixArabic(text, options)
   The one function the UI calls.
   -------------------------------------------------------------------------- */
export function fixArabic(text, opts = {}) {
  const {
    shape = true,        // apply contextual forms
    reverse = true,      // flip visual order (turn OFF for apps that do bidi)
    tashkeel = true,     // keep diacritics
    tatweel = true,      // keep tatweel
    digits = 'keep',     // 'keep' | 'latin' | 'arabic'
    normalize = false    // collapse letter variants
  } = opts;

  let t = text;

  // Someone will paste the output back in — by re-copying from their editor,
  // or just by hitting the button twice. Start from clean code points so that
  // the second pass reproduces the first rather than compounding it.
  //
  // Undoing has to mirror what was done: flip back before unshaping, because
  // unshaping splits the lam-alef ligature into two letters and reversing
  // after that would put them the wrong way round. If this pass is not going
  // to flip, the previous one presumably did not either, so only unshape.
  if (isAlreadyShaped(t)) t = reverse ? restoreArabic(t) : unshapeArabic(t);

  if (!tashkeel) t = stripTashkeel(t);
  if (!tatweel)  t = stripTatweel(t);
  if (normalize) t = normalizeLetters(t);
  if (digits === 'latin')  t = toLatinDigits(t);
  if (digits === 'arabic') t = toArabicDigits(t);

  if (shape)   t = shapeArabic(t);
  if (reverse) t = reverseBidi(t);

  return t;
}

/* --------------------------------------------------------------------------
   restoreArabic(text)
   The inverse trip. Takes text that has already been shaped and flipped —
   output from this tool, or Arabic copied out of a broken PDF or a video
   editor project file — and gives back clean, editable code points.
   -------------------------------------------------------------------------- */
export function restoreArabic(text) {
  return unshapeArabic(reverseBidi(text));
}
