import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { logError } from '@/utils/logger';

/**
 * Generates a PDF from a DOM element.
 * @param element The HTML element to capture.
 * @param fileName The name of the resulting PDF file.
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  fileName: string
): Promise<void> {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Check if there are explicit page elements
    const pageElements = element.querySelectorAll('.pdf-page');

    if (pageElements.length > 0) {
      for (let i = 0; i < pageElements.length; i++) {
        if (i > 0) pdf.addPage();

        const pageEl = pageElements[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const scaleFactor = pdfWidth / imgWidth;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight * scaleFactor);
      }
    } else {
      // Original fallback logic for continuous content
      const rect = element.getBoundingClientRect();
      const contentHeight = rect.height;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        height: contentHeight,
        windowHeight: contentHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const scaleFactor = pdfWidth / imgWidth;
      const scaledImgHeight = imgHeight * scaleFactor;

      if (scaledImgHeight <= pdfHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, scaledImgHeight);
      } else {
        let currentY = 0;
        let pageIndex = 0;

        while (currentY < imgHeight) {
          if (pageIndex > 0) pdf.addPage();

          const pageContentHeight = Math.min(imgHeight - currentY, pdfHeight / scaleFactor);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = imgWidth;
          pageCanvas.height = pageContentHeight;

          const ctx = pageCanvas.getContext('2d');
          if (!ctx) throw new Error('Failed to get canvas context');

          ctx.drawImage(
            canvas,
            0,
            currentY,
            imgWidth,
            pageContentHeight,
            0,
            0,
            imgWidth,
            pageContentHeight
          );

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, pageContentHeight * scaleFactor);

          currentY += pdfHeight / scaleFactor;
          pageIndex++;
        }
      }
    }

    pdf.save(fileName);
  } catch (error) {
    logError('PDF Generation failed:', error, 'PDFGenerator');
    throw error;
  }
}
