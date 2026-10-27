import { PDFDocument } from "pdf-lib";

export interface PdfInspectionResult {
  pageCount: number;
  detectedPaperSize: "A4" | "LEGAL" | "A3" | "CUSTOM";
  isEncrypted: boolean;
  pageDimensions: { width: number; height: number };
}

export async function inspectPdfBuffer(buffer: Buffer): Promise<PdfInspectionResult> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();

    if (pageCount === 0) {
      throw new Error("The uploaded PDF has no pages.");
    }

    const firstPage = pdfDoc.getPage(0);
    const { width, height } = firstPage.getSize();

    // Standard dimensions in points (1 pt = 1/72 inch):
    // A4: ~595 x 842
    // Legal: ~612 x 1008
    // A3: ~842 x 1190
    let detectedPaperSize: "A4" | "LEGAL" | "A3" | "CUSTOM" = "CUSTOM";
    const minDim = Math.min(width, height);
    const maxDim = Math.max(width, height);

    if (Math.abs(minDim - 595) < 30 && Math.abs(maxDim - 842) < 30) {
      detectedPaperSize = "A4";
    } else if (Math.abs(minDim - 612) < 30 && Math.abs(maxDim - 1008) < 30) {
      detectedPaperSize = "LEGAL";
    } else if (Math.abs(minDim - 842) < 30 && Math.abs(maxDim - 1190) < 30) {
      detectedPaperSize = "A3";
    } else {
      detectedPaperSize = "A4"; // default fallback
    }

    return {
      pageCount,
      detectedPaperSize,
      isEncrypted: pdfDoc.isEncrypted,
      pageDimensions: { width, height },
    };
  } catch (error: any) {
    if (error?.message?.includes("encrypted")) {
      return {
        pageCount: 0,
        detectedPaperSize: "CUSTOM",
        isEncrypted: true,
        pageDimensions: { width: 0, height: 0 },
      };
    }
    throw new Error(`Failed to parse PDF document: ${error?.message || "Invalid PDF format"}`);
  }
}

/**
 * Parses page range strings like "1-5, 8, 10-12" or "all"
 * and returns the count of unique pages selected within valid bounds.
 */
export function calculateSelectedPagesCount(pageRange: string, totalPages: number): number {
  const trimmed = pageRange.trim().toLowerCase();
  if (!trimmed || trimmed === "all") {
    return totalPages;
  }

  const selectedPages = new Set<number>();
  const parts = trimmed.split(",");

  for (const part of parts) {
    const segment = part.trim();
    if (!segment) continue;

    if (segment.includes("-")) {
      const [startStr, endStr] = segment.split("-");
      const start = parseInt(startStr || "0", 10);
      const end = parseInt(endStr || "0", 10);

      if (isNaN(start) || isNaN(end) || start > end || start < 1) {
        throw new Error(`Invalid page range specification: "${segment}"`);
      }

      for (let i = start; i <= Math.min(end, totalPages); i++) {
        selectedPages.add(i);
      }
    } else {
      const pageNum = parseInt(segment, 10);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
        throw new Error(`Page number ${segment} is out of bounds (1 to ${totalPages})`);
      }
      selectedPages.add(pageNum);
    }
  }

  return selectedPages.size;
}

