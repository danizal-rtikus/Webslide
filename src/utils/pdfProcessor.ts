import * as pdfjsLib from 'pdfjs-dist';

// PDF.js worker setup using a more robust CDN link matching the package version
// or using the unpkg CDN which is often more reliable for specific versions
const PDFJS_VERSION = '4.10.38';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

export interface PDFContent {
  text: string;
  pageCount: number;
}

/**
 * Extracts all text from a PDF file.
 */
export async function extractTextFromPDF(file: File): Promise<PDFContent> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  const pageCount = pdf.numPages;

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }

  return {
    text: fullText,
    pageCount
  };
}
