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

    out.push(line);
  }

  return out.join("\n");
};

export const renderFormattedContent = (content: string): string => {
  if (!content) return "";
  const withHeadings = normalizeHeadingMarkup(content);

  const safeTags: string[] = [];
  const safeTagPattern =
    /<\/?(h[1-4]|p|div|br|hr|blockquote|b|i|u|strong|em|span|sub|sup|table|thead|tbody|tr|td|th|ul|ol|li)(\s[^>]*)?\/?>/gi;
  const imgPattern = /<img\s[^>]*\/?>/gi;

  let processed = withHeadings;

  // Stash <img …> first
  processed = processed.replace(imgPattern, (match) => {
    const idx = safeTags.length;
    safeTags.push(match);
    return `__SAFE_TAG_${idx}__`;
  });

  // Then the rest of the safe tags
  processed = processed.replace(safeTagPattern, (match) => {
    const idx = safeTags.length;
    safeTags.push(match);
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

  return processed;
};
