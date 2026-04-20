/**
 * Shared formatting helpers for rendering document/template content
 * with markdown-style headings preserved as bold + underlined HTML.
 */

export const normalizeHeadingMarkup = (content: string): string => {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    const lineAfterNext = lines[i + 2];

    // Heading followed directly by underline (=== or ---)
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

  const safeContent = withHeadings
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;b&gt;/g, "<b>")
    .replace(/&lt;\/b&gt;/g, "</b>")
    .replace(/&lt;i&gt;/g, "<i>")
    .replace(/&lt;\/i&gt;/g, "</i>")
    .replace(/&lt;u&gt;/g, "<u>")
    .replace(/&lt;\/u&gt;/g, "</u>")
    .replace(/\n/g, "<br/>");

  return safeContent;
};
