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
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    const target = (host.querySelector("#holarc-document") as HTMLElement) || host;
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

    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    let remaining = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
    remaining -= pageHeight;
    while (remaining > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
      remaining -= pageHeight;
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
