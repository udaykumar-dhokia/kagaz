import { describe, expect, it } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { inspectPdfBuffer, calculateSelectedPagesCount } from "../pdf.service";
import { maskPhoneNumber } from "../../utils/masking";

describe("PDF Service & Utilities", () => {
  it("calculates selected page counts correctly from ranges", () => {
    // "all" with 12 pages -> 12
    expect(calculateSelectedPagesCount("all", 12)).toBe(12);

    // "1-5, 8, 10-12" with 20 pages -> pages 1,2,3,4,5, 8, 10,11,12 = 9 pages
    expect(calculateSelectedPagesCount("1-5, 8, 10-12", 20)).toBe(9);

    // Overlapping ranges "1-3, 2-4" -> pages 1,2,3,4 = 4 unique pages
    expect(calculateSelectedPagesCount("1-3, 2-4", 10)).toBe(4);

    // Single page "7"
    expect(calculateSelectedPagesCount("7", 10)).toBe(1);
  });

  it("throws error on out of bounds page numbers", () => {
    expect(() => calculateSelectedPagesCount("15", 10)).toThrow("out of bounds");
  });

  it("inspects a generated PDF buffer in memory", async () => {
    // Create an in-memory 3-page A4 PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595.28, 841.89]); // A4
    pdfDoc.addPage([595.28, 841.89]); // A4
    pdfDoc.addPage([595.28, 841.89]); // A4
    const pdfBytes = await pdfDoc.save();

    const inspection = await inspectPdfBuffer(Buffer.from(pdfBytes));

    expect(inspection.pageCount).toBe(3);
    expect(inspection.detectedPaperSize).toBe("A4");
    expect(inspection.isEncrypted).toBe(false);
  });

  it("masks phone numbers properly for customer privacy", () => {
    expect(maskPhoneNumber("+919876543210")).toBe("+91 ******3210");
    expect(maskPhoneNumber("9876543210")).toBe("******3210");
    expect(maskPhoneNumber(null)).toBe(null);
    expect(maskPhoneNumber(undefined)).toBe(null);
  });
});

