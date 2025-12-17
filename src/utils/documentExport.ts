import jsPDF from 'jspdf';

interface ExportOptions {
  title: string;
  content: string;
  logoUrl?: string;
  logoPosition?: { x: number; y: number };
  fontFamily?: string;
}

export const exportToPDF = async (options: ExportOptions): Promise<void> => {
  const { title, content, logoUrl, logoPosition } = options;
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Add logo if present
  if (logoUrl) {
    try {
      const img = await loadImage(logoUrl);
      const logoWidth = 40;
      const logoHeight = (img.height / img.width) * logoWidth;
      
      // Position logo based on logoPosition (x: 0-100 maps to left-right)
      let xPos = margin;
      if (logoPosition) {
        if (logoPosition.x > 66) {
          xPos = pageWidth - margin - logoWidth;
        } else if (logoPosition.x > 33) {
          xPos = (pageWidth - logoWidth) / 2;
        }
      }
      
      pdf.addImage(img, 'PNG', xPos, yPosition, logoWidth, logoHeight);
      yPosition += logoHeight + 10;
    } catch (error) {
      console.error('Failed to load logo:', error);
    }
  }

  // Set font
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  // Split content into lines
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Check if we need a new page
    if (yPosition > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    // Handle headings (lines with === or ---)
    if (line.match(/^=+$/) || line.match(/^-+$/)) {
      // Skip decoration lines
      continue;
    }

    // Check if previous line was a heading
    const isHeading = line.length > 0 && !line.startsWith(' ') && 
                      line === line.toUpperCase() && 
                      !line.includes(':') &&
                      !line.includes('.');

    if (isHeading) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
    } else {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
    }

    // Wrap text
    const wrappedLines = pdf.splitTextToSize(line || ' ', maxWidth);
    
    for (const wrappedLine of wrappedLines) {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(wrappedLine, margin, yPosition);
      yPosition += 5;
    }
  }

  // Save the PDF
  const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  pdf.save(fileName);
};

export const printDocument = (content: string, title: string, logoUrl?: string, fontFamily?: string): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for printing');
    return;
  }

  const fontFamilyCSS = getFontFamily(fontFamily);
  const formattedContent = renderFormattedContentForPrint(content);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Merriweather:wght@400;700&family=Open+Sans:wght@400;700&family=Playfair+Display:wght@400;700&family=Roboto:wght@400;700&family=Source+Serif+4:wght@400;700&family=Rockwell:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @media print {
          body {
            margin: 0;
            padding: 20mm;
          }
        }
        body {
          font-family: ${fontFamilyCSS};
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
          max-width: 210mm;
          margin: 0 auto;
          padding: 20mm;
          background: white;
        }
        .logo {
          max-height: 60px;
          margin-bottom: 20px;
        }
        .document-content {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: ${fontFamilyCSS};
          font-size: 12pt;
          margin: 0;
        }
        h1, h2, h3 {
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
      </style>
    </head>
    <body>
      ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo" />` : ''}
      <div class="document-content">${formattedContent}</div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.close();
          }, 500);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

const renderFormattedContentForPrint = (content: string): string => {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    if (nextLine && (/^=+$/.test(nextLine.trim()) || /^-+$/.test(nextLine.trim()))) {
      out.push(`<u><b>${line}</b></u>`);
      i++;
      continue;
    }

    out.push(line);
  }

  const withHeadings = out.join("\n");

  // Escape HTML for safety, but preserve our formatting tags
  return withHeadings
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;b&gt;/g, "<b>")
    .replace(/&lt;\/b&gt;/g, "</b>")
    .replace(/&lt;i&gt;/g, "<i>")
    .replace(/&lt;\/i&gt;/g, "</i>")
    .replace(/&lt;u&gt;/g, "<u>")
    .replace(/&lt;\/u&gt;/g, "</u>")
    .replace(/\n/g, "<br/>");
};

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

const getFontFamily = (fontFamily?: string): string => {
  const fontMap: Record<string, string> = {
    'sans': 'system-ui, -apple-system, sans-serif',
    'roboto': "'Roboto', sans-serif",
    'open-sans': "'Open Sans', sans-serif",
    'lora': "'Lora', serif",
    'merriweather': "'Merriweather', serif",
    'playfair': "'Playfair Display', serif",
    'source-serif': "'Source Serif 4', serif",
    'rockwell': "'Rockwell', Georgia, serif",
  };
  return fontMap[fontFamily || 'sans'] || fontMap['sans'];
};

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};
