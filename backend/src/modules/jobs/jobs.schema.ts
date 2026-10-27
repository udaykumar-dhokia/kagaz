import { z } from "zod";

export const presignedUrlSchema = z.object({
  shopSlug: z.string().min(1, "Shop slug is required"),
  filename: z.string().min(1, "Filename is required"),
  contentType: z.string().default("application/pdf"),
});

export const inspectPdfSchema = z.object({
  fileKey: z.string().min(1, "File key is required"),
});

export const orderItemSchema = z.object({
  fileKey: z.string().min(1, "File key is required"),
  originalFilename: z.string().min(1, "Original filename is required"),
  fileSize: z.coerce.number().positive(),
  pageCount: z.coerce.number().positive(),
  pageRange: z.string().default("all"),
  copies: z.coerce.number().int().min(1).default(1),
  colorMode: z.enum(["BW", "COLOR"]).default("BW"),
  paperSize: z.string().default("A4"),
  isDuplex: z.boolean().default(false),
});

export const createOrderSchema = z.object({
  shopSlug: z.string().min(1, "Shop slug is required"),
  customerPhone: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "At least one document item is required"),
  selectedAddonIds: z.array(z.string()).default([]),
});

export const quoteOrderSchema = z.object({
  shopSlug: z.string().min(1, "Shop slug is required"),
  items: z.array(
    z.object({
      pageCount: z.coerce.number().positive(),
      copies: z.coerce.number().int().min(1).default(1),
      colorMode: z.enum(["BW", "COLOR"]).default("BW"),
      paperSize: z.string().default("A4"),
      isDuplex: z.boolean().default(false),
    })
  ).min(1),
  selectedAddonIds: z.array(z.string()).default([]),
});

