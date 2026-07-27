/**
 * Shared formatting helpers for rendering document/template content.
 *
 * - Converts `=== / ---` underline-style markdown headings into bold + underlined HTML.
 * - Preserves a safe-list of HTML tags (b, i, u, headings, tables, lists, br, hr, images)
 *   so that letterhead images and tables embedded in template content survive escaping.
 * - Escapes everything else and converts plain newlines to <br/>.
 */

export const normalizeHeadingMarkup = (content: string): string => {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    const lineAfterNext = lines[i + 2];

    // Heading followed directly by underline
    if (nextLine && (/^=+$/.test(nextLine.trim()) || /^-+$/.test(nextLine.trim()))) {
      out.push(`<u><b>${line}</b></u>`);
      i++;
      continue;
    }

    // Heading followed by blank line then underline
    if (
      nextLine?.trim() === "" &&
      lineAfterNext &&
      (/^=+$/.test(lineAfterNext.trim()) || /^-+$/.test(lineAfterNext.trim()))
    ) {
      out.push(`<u><b>${line}</b></u>`);
      i += 2;
      continue;
    }

    // Plain ALL-CAPS section heading (templates are stored as plain text —
    // emphasis is applied here so users never see raw <u><b> markup).
    if (isPlainCapsHeading(line)) {
      out.push(`<u><b>${line.trim()}</b></u>`);
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
};

/** A short, all-uppercase line with no placeholders — treated as a heading. */
const isPlainCapsHeading = (line: string): boolean => {
  const t = line.trim();
  if (!t || t.length > 60) return false;
  if (t.includes("[") || t.includes("<")) return false;
  if (/[a-z]/.test(t)) return false;
  if (!/[A-Z]/.test(t)) return false;
  if (t.endsWith(":")) return false;
  return /^[A-Z0-9 ()\-—–&,./']+$/.test(t);
};

/**
 * Inverse of the heading emphasis: turns stored `<u><b>X</b></u>` (and the
 * bold/underline swap) back into plain text so template editors never show
 * raw HTML. Emphasis is re-applied at render time.
 */
export const stripHeadingMarkup = (content: string): string =>
  (content || "")
    .replace(/<u>\s*<b>([\s\S]*?)<\/b>\s*<\/u>/gi, "$1")
    .replace(/<b>\s*<u>([\s\S]*?)<\/u>\s*<\/b>/gi, "$1");


import DOMPurify from "dompurify";

/**
 * Strip dangerous attributes (event handlers, javascript: URLs) from a tag string.
 */
const SAFE_STYLE_PROPS = new Set([
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "color",
  "line-height",
  "display",
  "text-align",
  "max-height",
  "max-width",
  "height",
  "width",
  "margin",
  "padding",
]);

/** Keep only a whitelist of harmless presentation properties. */
const sanitizeStyleValue = (declarations: string): string =>
  declarations
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((d) => {
      const [prop, ...rest] = d.split(":");
      const value = rest.join(":").toLowerCase();
      if (!prop || !value) return false;
      if (/url\(|expression\(|javascript:|@import/.test(value)) return false;
      return SAFE_STYLE_PROPS.has(prop.trim().toLowerCase());
    })
    .join(";");

const sanitizeTagAttributes = (tag: string): string => {
  // Remove all on* event handler attributes (onerror, onclick, etc.)
  let cleaned = tag.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // Remove javascript:, data:text/html, vbscript: URIs in href/src/etc.
  cleaned = cleaned.replace(
    /\s+(href|src|action|formaction|xlink:href)\s*=\s*("|')\s*(javascript|vbscript|data:text\/html)[^"']*\2/gi,
    "",
  );
  // Keep style attributes but strip everything that isn't plain presentation
  // (needed so typed doctor signatures keep their font/colour/size).
  cleaned = cleaned.replace(/\s+style\s*=\s*("([^"]*)"|'([^']*)')/gi, (_m, _q, dq, sq) => {
    const safe = sanitizeStyleValue(dq ?? sq ?? "");
    return safe ? ` style="${safe}"` : "";
  });
  return cleaned;
};


export const renderFormattedContent = (content: string): string => {
  if (!content) return "";
  const withHeadings = normalizeHeadingMarkup(content);

  const safeTags: string[] = [];
  const safeTagPattern =
    /<\/?(h[1-4]|p|div|br|hr|blockquote|b|i|u|strong|em|span|sub|sup|table|thead|tbody|tr|td|th|ul|ol|li)(\s[^>]*)?\/?>/gi;
  const imgPattern = /<img\s[^>]*\/?>/gi;

  let processed = withHeadings;

  // Stash <img …> first (with attributes scrubbed)
  processed = processed.replace(imgPattern, (match) => {
    const idx = safeTags.length;
    safeTags.push(sanitizeTagAttributes(match));
    return `__SAFE_TAG_${idx}__`;
  });

  // Then the rest of the safe tags (also scrubbed)
  processed = processed.replace(safeTagPattern, (match) => {
    const idx = safeTags.length;
    safeTags.push(sanitizeTagAttributes(match));
    return `__SAFE_TAG_${idx}__`;
  });

  // Escape everything else
  processed = processed.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Restore safe tags
  for (let i = 0; i < safeTags.length; i++) {
    processed = processed.replace(`__SAFE_TAG_${i}__`, safeTags[i]);
  }

  // Convert plain newlines to <br/> only when there are no block-level tags
  const hasBlockTags = /<(h[1-4]|p|div|table|ul|ol|br|hr)/i.test(processed);
  if (!hasBlockTags) {
    processed = processed.replace(/\n/g, "<br/>");
  }

  // Final defense-in-depth pass through DOMPurify to strip anything that slipped past.
  return DOMPurify.sanitize(processed, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "p", "div", "br", "hr", "blockquote",
      "b", "i", "u", "strong", "em", "span", "sub", "sup",
      "table", "thead", "tbody", "tr", "td", "th",
      "ul", "ol", "li", "img",
    ],
    ALLOWED_ATTR: ["src", "alt", "width", "height", "colspan", "rowspan", "align", "style"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|data:image\/)/i,
  });
};
