import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Rasterises a rendered document HTML string into an A4 PDF and returns it as
 * base64 (no data-url prefix) so it can be attached to outgoing emails.
 */
export async function buildDocumentPdfBase64(html: string): Promise<string | null> {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "794px"; // ~210mm at 96dpi
  host.style.background = "#ffffff";
  // Document text must not inherit the application UI's negative tracking.
  host.style.letterSpacing = "normal";
  host.style.wordSpacing = "normal";
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    const target = (host.querySelector("#holarc-document") as HTMLElement) || host;
    // Explicit tracking makes html2canvas render whitespace reliably, including
    // older saved documents whose root still specifies normal tracking.
    target.style.letterSpacing = "0.15px";
    target.style.wordSpacing = "1px";
    // Give remote images (logo/letterhead) a chance to load before rasterising.
    await Promise.all(
      Array.from(target.querySelectorAll("img")).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 4000);
          }),
      ),
    );

    await document.fonts.ready;
    const renderOptions = {
      scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false,
      onclone: (_doc: Document, clonedTarget: HTMLElement) => {
        clonedTarget.style.letterSpacing = "0.15px";
        clonedTarget.style.wordSpacing = "1px";
      },
    };
    // Only the temporary render DOM is changed; stored signed HTML is preserved.
    const legacyFooter = target.lastElementChild as HTMLElement | null;
    const footer = target.querySelector<HTMLElement>("[data-document-footer]")
      ?? (legacyFooter?.style.fontSize === "9.5px" && legacyFooter.style.borderTop && legacyFooter.style.textAlign === "center" ? legacyFooter : null);
    let footerCanvas: HTMLCanvasElement | null = null;
    if (footer) {
      const footerHost = document.createElement("div");
      footerHost.style.cssText = "position:absolute;top:0;left:0;background:white";
      footerHost.style.width = footer.getBoundingClientRect().width + "px";
      footerHost.style.fontFamily = getComputedStyle(target).fontFamily;
      const footerCopy = footer.cloneNode(true) as HTMLElement;
      footerCopy.style.marginTop = "0";
      footerCopy.style.paddingBottom = "8px";
      footerHost.appendChild(footerCopy);
      host.appendChild(footerHost);
      try { footerCanvas = await html2canvas(footerCopy, renderOptions); }
      finally { footerHost.remove(); }
      footer.remove();
    }
    const canvas = await html2canvas(target, renderOptions);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20; // mm: reserved on every page, not only the outer HTML.
    const pixelsPerMm = canvas.width / pageWidth;
    const footerWidth = footerCanvas ? footerCanvas.width / pixelsPerMm : 0;
    const footerHeight = footerCanvas ? footerCanvas.height / pixelsPerMm : 0;
    const bottomMargin = Math.max(margin, footerHeight + 14);
    const footerImage = footerCanvas?.toDataURL("image/jpeg", 0.98);
    const pagePixels = Math.floor((pageHeight - margin - bottomMargin) * pixelsPerMm);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Could not read document image");
    let top = 0;
    while (top < canvas.height) {
      let bottom = Math.min(canvas.height, top + pagePixels);
      if (bottom < canvas.height) {
        // Prefer a blank scanline above the boundary so letters aren't bisected.
        const searchStart = Math.max(top + Math.floor(pagePixels * 0.75), bottom - 160);
        const strip = context.getImageData(0, searchStart, canvas.width, bottom - searchStart);
        for (let row = strip.height - 1; row >= 0; row--) {
          let blank = true;
          for (let x = 0; x < strip.width; x++) {
            const i = (row * strip.width + x) * 4;
            if (strip.data[i] < 245 || strip.data[i + 1] < 245 || strip.data[i + 2] < 245) { blank = false; break; }
          }
          if (blank) { bottom = searchStart + row + 1; break; }
        }
      }
      if (bottom < canvas.height) {
        const bounds = target.getBoundingClientRect();
        const scale = canvas.width / bounds.width;
        for (const heading of target.querySelectorAll("h2, h3")) {
          const rect = heading.getBoundingClientRect();
          const y = Math.floor((rect.top - bounds.top) * scale);
          if (y > top && y < bottom && y + (rect.height + 60) * scale > bottom) bottom = y;
        }
      }
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = bottom - top;
      const sliceContext = slice.getContext("2d");
      if (!sliceContext) throw new Error("Could not create document page");
      sliceContext.drawImage(canvas, 0, top, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      if (top > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.98), "JPEG", 0, margin, pageWidth, slice.height / pixelsPerMm, `document-body-${top}`);
      if (footerImage) {
        pdf.addImage(footerImage, "JPEG", (pageWidth - footerWidth) / 2, pageHeight - 8 - footerHeight, footerWidth, footerHeight, "document-footer");
      }
      top = bottom;
    }

    const dataUri = pdf.output("datauristring");
    return dataUri.split(",")[1] || null;
  } catch (err) {
    console.error("PDF generation failed", err);
    return null;
  } finally {
    host.remove();
  }
}

export const pdfFileName = (label: string): string =>
  `${label.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "document"}.pdf`;

/** Builds a PDF from HTML and returns an object URL (caller revokes it). */
export async function buildDocumentPdfUrl(html: string): Promise<string | null> {
  const b64 = await buildDocumentPdfBase64(html);
  if (!b64) return null;
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

/** Builds a PDF from HTML and downloads it. */
export async function downloadHtmlAsPdf(html: string, label: string): Promise<boolean> {
  const url = await buildDocumentPdfUrl(html);
  if (!url) return false;
  const a = document.createElement("a");
  a.href = url;
  a.download = pdfFileName(label);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}
