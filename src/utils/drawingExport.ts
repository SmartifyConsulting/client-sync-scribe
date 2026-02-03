import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { CanvasData, CanvasElement, SessionDrawing } from '@/hooks/useSessionDrawings';

/**
 * Drawing Export Utilities
 * Prepares clinical drawings for PDF, image, and patient record integration
 */

export interface DrawingExportMetadata {
  patientId: string;
  patientName?: string;
  sessionId?: string;
  doctorName?: string;
  doctorId?: string;
  exportedAt: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExportableDrawing {
  metadata: DrawingExportMetadata;
  canvasData: CanvasData;
  thumbnailUrl?: string;
}

/**
 * Prepare drawing data for export/integration with external systems
 */
export function prepareDrawingForExport(
  drawing: SessionDrawing,
  options: {
    patientName?: string;
    doctorName?: string;
  } = {}
): ExportableDrawing {
  return {
    metadata: {
      patientId: drawing.patient_id,
      patientName: options.patientName,
      sessionId: drawing.session_id || undefined,
      doctorName: options.doctorName,
      doctorId: drawing.doctor_id,
      exportedAt: new Date().toISOString(),
      version: drawing.version,
      createdAt: drawing.created_at,
      updatedAt: drawing.updated_at,
    },
    canvasData: drawing.canvas_data,
  };
}

/**
 * Export canvas to high-resolution PNG
 */
export async function exportCanvasToPNG(
  canvas: HTMLCanvasElement,
  filename: string,
  scale: number = 2
): Promise<string> {
  // Create a high-resolution version
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width * scale;
  tempCanvas.height = canvas.height * scale;
  
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  // Scale and draw
  ctx.scale(scale, scale);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(canvas, 0, 0);
  
  const dataUrl = tempCanvas.toDataURL('image/png', 1.0);
  
  // Trigger download
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
  
  return dataUrl;
}

/**
 * Generate thumbnail from canvas data
 */
export async function generateThumbnail(
  canvas: HTMLCanvasElement,
  maxDimension: number = 200
): Promise<string> {
  const aspectRatio = canvas.width / canvas.height;
  let width = maxDimension;
  let height = maxDimension;
  
  if (aspectRatio > 1) {
    height = maxDimension / aspectRatio;
  } else {
    width = maxDimension * aspectRatio;
  }
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(canvas, 0, 0, width, height);
  
  return tempCanvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Export drawing to PDF with clinical formatting
 */
export async function exportDrawingToPDF(
  canvasElement: HTMLCanvasElement | null,
  metadata: DrawingExportMetadata,
  options: {
    includeMetadata?: boolean;
    orientation?: 'portrait' | 'landscape';
    title?: string;
  } = {}
): Promise<void> {
  const { includeMetadata = true, orientation = 'landscape', title } = options;
  
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title || 'Clinical Drawing', margin, yPos);
  yPos += 8;

  // Metadata section
  if (includeMetadata) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    const metadataLines = [
      `Patient: ${metadata.patientName || 'Unknown'}`,
      `Date: ${format(new Date(metadata.createdAt), 'MMMM d, yyyy')}`,
      `Version: ${metadata.version}`,
      metadata.sessionId ? `Session ID: ${metadata.sessionId}` : null,
      metadata.doctorName ? `Clinician: ${metadata.doctorName}` : null,
    ].filter(Boolean) as string[];
    
    metadataLines.forEach(line => {
      pdf.text(line, margin, yPos);
      yPos += 5;
    });
    
    yPos += 5;
    
    // Separator line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
  }

  // Add canvas image
  if (canvasElement) {
    try {
      const dataUrl = canvasElement.toDataURL('image/png', 1.0);
      const imgAspect = canvasElement.width / canvasElement.height;
      
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - yPos - margin - 20;
      
      let imgWidth = availableWidth;
      let imgHeight = imgWidth / imgAspect;
      
      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = imgHeight * imgAspect;
      }
      
      const xPos = (pageWidth - imgWidth) / 2;
      
      pdf.addImage(dataUrl, 'PNG', xPos, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 10;
    } catch (error) {
      console.error('Failed to add canvas to PDF:', error);
    }
  }

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text(
    `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')} | Document ID: ${metadata.patientId.slice(0, 8)}`,
    margin,
    pageHeight - 10
  );

  // Save
  const filename = `clinical-drawing-${metadata.patientName?.replace(/\s+/g, '-') || 'patient'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdf.save(filename);
}

/**
 * Prepare element data for patient record integration
 * Returns a clean, serializable structure suitable for EHR/EMR systems
 */
export function prepareForPatientRecord(drawing: SessionDrawing): {
  type: 'clinical_drawing';
  version: string;
  data: {
    elements: {
      id: string;
      type: string;
      content: any;
      position: { x: number; y: number };
      dimensions?: { width: number; height: number };
      style?: { color?: string; strokeWidth?: number };
      metadata?: { tags?: string[]; createdAt?: string };
    }[];
    summary: {
      anatomyCount: number;
      annotationCount: number;
      textLabelCount: number;
      shapeCount: number;
    };
  };
  audit: {
    createdAt: string;
    updatedAt: string;
    version: number;
    doctorId: string;
  };
} {
  const elements = drawing.canvas_data.elements || [];
  
  const mappedElements = elements.map(el => ({
    id: el.id,
    type: el.type,
    content: el.data,
    position: { x: el.x, y: el.y },
    dimensions: el.width && el.height ? { width: el.width, height: el.height } : undefined,
    style: el.color || el.strokeWidth ? { color: el.color, strokeWidth: el.strokeWidth } : undefined,
    metadata: el.data.tags || el.data.createdAt ? { 
      tags: el.data.tags, 
      createdAt: el.data.createdAt 
    } : undefined,
  }));

  return {
    type: 'clinical_drawing',
    version: '1.0',
    data: {
      elements: mappedElements,
      summary: {
        anatomyCount: elements.filter(e => e.type === 'anatomy').length,
        annotationCount: elements.filter(e => e.type === 'path').length,
        textLabelCount: elements.filter(e => e.type === 'text').length,
        shapeCount: elements.filter(e => e.type === 'shape').length,
      },
    },
    audit: {
      createdAt: drawing.created_at,
      updatedAt: drawing.updated_at,
      version: drawing.version,
      doctorId: drawing.doctor_id,
    },
  };
}

/**
 * Export complete container element (including anatomy overlays) to image
 */
export async function exportContainerToImage(
  containerElement: HTMLDivElement,
  filename: string,
  options: {
    scale?: number;
    backgroundColor?: string;
  } = {}
): Promise<string> {
  const { scale = 2, backgroundColor = '#FFFFFF' } = options;
  
  const canvas = await html2canvas(containerElement, {
    scale,
    backgroundColor,
    useCORS: true,
    logging: false,
    windowWidth: containerElement.scrollWidth,
    windowHeight: containerElement.scrollHeight,
  });
  
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
  
  return dataUrl;
}

/**
 * Get element statistics from canvas data
 */
export function getDrawingStatistics(canvasData: CanvasData): {
  totalElements: number;
  anatomyDiagrams: number;
  freehandAnnotations: number;
  textLabels: number;
  shapes: number;
  taggedElements: number;
  uniqueTags: string[];
} {
  const elements = canvasData.elements || [];
  
  const taggedElements = elements.filter(el => el.data?.tags?.length > 0);
  const allTags = taggedElements.flatMap(el => el.data.tags || []);
  const uniqueTags = [...new Set(allTags)];
  
  return {
    totalElements: elements.length,
    anatomyDiagrams: elements.filter(e => e.type === 'anatomy').length,
    freehandAnnotations: elements.filter(e => e.type === 'path').length,
    textLabels: elements.filter(e => e.type === 'text').length,
    shapes: elements.filter(e => e.type === 'shape').length,
    taggedElements: taggedElements.length,
    uniqueTags,
  };
}
