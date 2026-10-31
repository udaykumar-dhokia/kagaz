import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { db } from "../../db";
import { shops, shopPrintSettings, shopAddons, printJobs, printJobItems } from "../../db/schema";
import { env } from "../../config/env";
import {
  presignedUrlSchema,
  inspectPdfSchema,
  createOrderSchema,
  quoteOrderSchema,
} from "./jobs.schema";
import {
  generatePresignedUploadUrl,
  getFileBuffer,
  saveLocalFile,
} from "../../services/storage.service";
import { inspectPdfBuffer, calculateSelectedPagesCount } from "../../services/pdf.service";
import { calculateOrderQuote } from "../../services/pricing.service";
import { generateUniquePickupPin } from "../../utils/pin";
import { maskPhoneNumber } from "../../utils/masking";
import { wsManager } from "../../services/websocket.service";
import { dodoService } from "../../services/dodo.service";

export const jobsRoutes = new Hono();

// ==========================================
// 1. Generate Presigned Upload URL
// ==========================================
// POST /api/v1/jobs/presigned-upload
jobsRoutes.post("/presigned-upload", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = presignedUrlSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, errors: parsed.error.flatten().fieldErrors }, 400);
    }

    const { shopSlug, filename, contentType } = parsed.data;

    const [shop] = await db
      .select({
        id: shops.id,
        isActive: shops.isActive,
        createdAt: shops.createdAt,
        trialEndsAt: shops.trialEndsAt,
        subscriptionStatus: shops.subscriptionStatus,
        subscriptionEndsAt: shops.subscriptionEndsAt,
      })
      .from(shops)
      .where(eq(shops.slug, shopSlug));

    if (!shop || !shop.isActive) {
      return c.json({ success: false, message: "Shop not found or currently offline" }, 404);
    }

    const trialInfo = dodoService.calculateTrialStatus(shop);
    if (!trialInfo.canAccessPlatform) {
      return c.json(
        {
          success: false,
          message: "This shop counter is currently paused pending subscription renewal. Please contact the counter operator.",
        },
        403
      );
    }

    const result = await generatePresignedUploadUrl(shop.id, filename, contentType);

    return c.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("Presigned upload error:", err);
    return c.json({ success: false, message: err.message || "Failed to generate upload URL" }, 500);
  }
});

// ==========================================
// 2. Direct Multipart Upload (Local Dev / Fallback)
// ==========================================
// POST /api/v1/jobs/upload-direct?fileKey=...
jobsRoutes.post("/upload-direct", async (c) => {
  try {
    const fileKey = c.req.query("fileKey");
    if (!fileKey) {
      return c.json({ success: false, message: "Query parameter fileKey is required" }, 400);
    }

    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, message: "No valid file uploaded" }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await saveLocalFile(fileKey, buffer);

    return c.json({
      success: true,
      message: "File uploaded successfully to local storage",
      data: { fileKey },
    });
  } catch (err: any) {
    console.error("Direct upload error:", err);
    return c.json({ success: false, message: err.message || "Failed to upload file" }, 500);
  }
});

// ==========================================
// 3. Inspect Uploaded PDF (Page count & Paper size)
// ==========================================
// POST /api/v1/jobs/inspect-pdf
jobsRoutes.post("/inspect-pdf", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = inspectPdfSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, errors: parsed.error.flatten().fieldErrors }, 400);
    }

    const { fileKey } = parsed.data;
    const buffer = await getFileBuffer(fileKey);
    const inspection = await inspectPdfBuffer(buffer);

    return c.json({
      success: true,
      data: inspection,
    });
  } catch (err: any) {
    console.error("PDF inspection error:", err);
    return c.json({ success: false, message: err.message || "Failed to inspect PDF" }, 400);
  }
});

// ==========================================
// 3b. Stream Uploaded Document for Direct Preview
// ==========================================
// GET /api/v1/jobs/preview
jobsRoutes.get("/preview", async (c) => {
  const fileKey = c.req.query("fileKey");
  if (!fileKey) {
    return c.json({ success: false, message: "Missing fileKey query parameter" }, 400);
  }

  try {
    const buffer = await getFileBuffer(fileKey);
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="preview.pdf"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("PDF preview error:", err);
    return c.json({ success: false, message: err?.message || "Failed to load document preview" }, 404);
  }
});

// ==========================================
// 4. Calculate Order Quote
// ==========================================
// POST /api/v1/jobs/quote
jobsRoutes.post("/quote", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = quoteOrderSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, errors: parsed.error.flatten().fieldErrors }, 400);
    }

    const { shopSlug, items, selectedAddonIds } = parsed.data;

    const [shop] = await db
      .select({ id: shops.id, isActive: shops.isActive })
      .from(shops)
      .where(eq(shops.slug, shopSlug));

    if (!shop || !shop.isActive) {
      return c.json({ success: false, message: "Shop not found or offline" }, 404);
    }

    const [settings] = await db
      .select()
      .from(shopPrintSettings)
      .where(eq(shopPrintSettings.shopId, shop.id));

    if (!settings) {
      return c.json({ success: false, message: "Shop catalog not initialized" }, 500);
    }

    const addons = await db
      .select()
      .from(shopAddons)
      .where(and(eq(shopAddons.shopId, shop.id), eq(shopAddons.isActive, true)));

    const quote = calculateOrderQuote(settings, addons, items, selectedAddonIds);

    return c.json({
      success: true,
      data: quote,
    });
  } catch (err: any) {
    console.error("Quote calculation error:", err);
    return c.json({ success: false, message: err.message || "Failed to calculate quote" }, 400);
  }
});

// ==========================================
// 5. Create Print Job & Issue 4-Digit PIN
// ==========================================
// POST /api/v1/jobs
jobsRoutes.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, errors: parsed.error.flatten().fieldErrors }, 400);
    }

    const { shopSlug, customerPhone, items, selectedAddonIds } = parsed.data;

    // 1. Verify shop exists & active
    const [shop] = await db
      .select({
        id: shops.id,
        name: shops.name,
        isActive: shops.isActive,
        createdAt: shops.createdAt,
        trialEndsAt: shops.trialEndsAt,
        subscriptionStatus: shops.subscriptionStatus,
        subscriptionEndsAt: shops.subscriptionEndsAt,
      })
      .from(shops)
      .where(eq(shops.slug, shopSlug));

    if (!shop || !shop.isActive) {
      return c.json({ success: false, message: "Shop not found or currently offline" }, 404);
    }

    const trialInfo = dodoService.calculateTrialStatus(shop);
    if (!trialInfo.canAccessPlatform) {
      return c.json(
        {
          success: false,
          message: "This shop counter is currently paused pending subscription renewal. Please contact the counter operator.",
        },
        403
      );
    }

    // 2. Fetch catalog settings & addons
    const [settings] = await db
      .select()
      .from(shopPrintSettings)
      .where(eq(shopPrintSettings.shopId, shop.id));

    if (!settings) {
      return c.json({ success: false, message: "Shop catalog configuration missing" }, 500);
    }

    const addons = await db
      .select()
      .from(shopAddons)
      .where(and(eq(shopAddons.shopId, shop.id), eq(shopAddons.isActive, true)));

    // 3. Process item page ranges & calculate authoritative price
    const quoteInputItems = items.map((it) => {
      const effectivePageCount = calculateSelectedPagesCount(it.pageRange, it.pageCount);
      return {
        pageCount: effectivePageCount,
        copies: it.copies,
        colorMode: it.colorMode,
        paperSize: it.paperSize,
        isDuplex: it.isDuplex,
      };
    });

    const quote = calculateOrderQuote(settings, addons, quoteInputItems, selectedAddonIds);

    // 4. Generate collision-safe 4-digit pickup PIN
    const pickupPin = await generateUniquePickupPin(shop.id);
    const customerSessionId = crypto.randomBytes(16).toString("hex");

    // 5. Set expiration TTL (default 60 minutes)
    const expiresAt = new Date(Date.now() + env.DOCUMENT_TTL_MINUTES * 60 * 1000);

    // 6. Mask customer phone number for privacy
    const customerPhoneMasked = maskPhoneNumber(customerPhone);

    // 7. Insert Print Job and Items in database
    const [createdJob] = await db
      .insert(printJobs)
      .values({
        shopId: shop.id,
        pickupPin,
        customerSessionId,
        customerPhoneMasked,
        status: "QUEUED",
        totalAmount: quote.totalAmount.toFixed(2),
        paymentStatus: "UNPAID",
        expiresAt,
      })
      .returning();

    if (!createdJob) {
      return c.json({ success: false, message: "Failed to create print job" }, 500);
    }

    // Insert line items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const calculatedItem = quote.items[i]!;

      await db.insert(printJobItems).values({
        jobId: createdJob.id,
        fileKey: item.fileKey,
        originalFilename: item.originalFilename,
        fileSize: item.fileSize,
        pageCount: calculatedItem.pageCount,
        pageRange: item.pageRange,
        copies: item.copies,
        colorMode: item.colorMode,
        paperSize: item.paperSize,
        isDuplex: item.isDuplex,
        itemPrice: calculatedItem.itemTotal.toFixed(2),
      });
    }

    // Broadcast instant real-time alert to shopkeeper dashboard
    wsManager.broadcastToShop(shop.id, {
      type: "JOB_CREATED",
      data: {
        jobId: createdJob.id,
        pickupPin: createdJob.pickupPin,
        totalAmount: createdJob.totalAmount,
        status: createdJob.status,
        customerPhoneMasked: createdJob.customerPhoneMasked,
        itemsCount: items.length,
        totalPages: quote.items.reduce((acc, it) => acc + it.pageCount * it.copies, 0),
        createdAt: createdJob.createdAt,
      },
    });

    return c.json(
      {
        success: true,
        message: "Print job created successfully",
        data: {
          jobId: createdJob.id,
          pickupPin: createdJob.pickupPin,
          shopName: shop.name,
          totalAmount: createdJob.totalAmount,
          status: createdJob.status,
          customerPhoneMasked: createdJob.customerPhoneMasked,
          expiresAt: createdJob.expiresAt,
          summary: {
            itemsCount: items.length,
            totalPages: quote.items.reduce((acc, it) => acc + it.pageCount * it.copies, 0),
            subtotalItems: quote.subtotalItems,
            subtotalAddons: quote.subtotalAddons,
          },
        },
      },
      201
    );
  } catch (err: any) {
    console.error("Order creation error:", err);
    return c.json({ success: false, message: err.message || "Failed to create order" }, 400);
  }
});

// ==========================================
// 6. Customer Check Job Status
// ==========================================
// GET /api/v1/jobs/:id/status
jobsRoutes.get("/:id/status", async (c) => {
  const jobId = c.req.param("id");

  const [job] = await db
    .select({
      id: printJobs.id,
      pickupPin: printJobs.pickupPin,
      status: printJobs.status,
      totalAmount: printJobs.totalAmount,
      paymentStatus: printJobs.paymentStatus,
      expiresAt: printJobs.expiresAt,
      completedAt: printJobs.completedAt,
      createdAt: printJobs.createdAt,
    })
    .from(printJobs)
    .where(eq(printJobs.id, jobId));

  if (!job) {
    return c.json({ success: false, message: "Job not found" }, 404);
  }

  // Check if job is expired
  const isExpired = new Date() > new Date(job.expiresAt) && job.status !== "COMPLETED";

  return c.json({
    success: true,
    data: {
      ...job,
      status: isExpired ? "EXPIRED" : job.status,
    },
  });
});

