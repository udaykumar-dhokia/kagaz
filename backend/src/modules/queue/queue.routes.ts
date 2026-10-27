import { Hono } from "hono";
import { eq, and, desc, inArray, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import { printJobs, printJobItems } from "../../db/schema";
import { requireShopAuth, type AppEnv } from "../../middlewares/auth.middleware";
import { deleteDocument } from "../../services/storage.service";
import { wsManager } from "../../services/websocket.service";

export const queueRoutes = new Hono<AppEnv>();

// Protect all queue routes with shopkeeper authentication
queueRoutes.use("*", requireShopAuth);

// ==========================================
// 1. Fetch Active Live Queue
// ==========================================
// GET /api/v1/shop/queue
queueRoutes.get("/", async (c) => {
  const shopId = c.get("shopId");

  try {
    // Fetch active jobs (QUEUED or PRINTING) that haven't expired
    const activeJobs = await db
      .select({
        id: printJobs.id,
        pickupPin: printJobs.pickupPin,
        status: printJobs.status,
        totalAmount: printJobs.totalAmount,
        paymentStatus: printJobs.paymentStatus,
        customerPhoneMasked: printJobs.customerPhoneMasked,
        expiresAt: printJobs.expiresAt,
        createdAt: printJobs.createdAt,
      })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shopId),
          inArray(printJobs.status, ["QUEUED", "PRINTING"]),
          gt(printJobs.expiresAt, new Date())
        )
      )
      .orderBy(desc(printJobs.createdAt));

    // Fetch line items for each active job
    const jobsWithItems = await Promise.all(
      activeJobs.map(async (job) => {
        const items = await db
          .select({
            id: printJobItems.id,
            originalFilename: printJobItems.originalFilename,
            pageCount: printJobItems.pageCount,
            pageRange: printJobItems.pageRange,
            copies: printJobItems.copies,
            colorMode: printJobItems.colorMode,
            paperSize: printJobItems.paperSize,
            isDuplex: printJobItems.isDuplex,
            itemPrice: printJobItems.itemPrice,
            fileKey: printJobItems.fileKey,
          })
          .from(printJobItems)
          .where(eq(printJobItems.jobId, job.id));

        return {
          ...job,
          items,
        };
      })
    );

    return c.json({
      success: true,
      data: jobsWithItems,
    });
  } catch (err: any) {
    console.error("Fetch queue error:", err);
    return c.json({ success: false, message: err.message || "Failed to load queue" }, 500);
  }
});

// ==========================================
// 2. Keyboard-First PIN Verification
// ==========================================
// POST /api/v1/shop/queue/verify-pin
const verifyPinSchema = z.object({
  pin: z.string().length(4, "PIN must be exactly 4 digits"),
});

queueRoutes.post("/verify-pin", async (c) => {
  const shopId = c.get("shopId");
  const body = await c.req.json();
  const parsed = verifyPinSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, errors: parsed.error.flatten().fieldErrors }, 400);
  }

  const { pin } = parsed.data;

  try {
    // Find active job matching this PIN for this shop
    const [job] = await db
      .select()
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shopId),
          eq(printJobs.pickupPin, pin),
          inArray(printJobs.status, ["QUEUED", "PRINTING"]),
          gt(printJobs.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!job) {
      return c.json(
        {
          success: false,
          message: `No active print job found for PIN "${pin}". The PIN may be incorrect or expired.`,
        },
        404
      );
    }

    // Automatically transition to PRINTING status if it was QUEUED
    if (job.status === "QUEUED") {
      await db
        .update(printJobs)
        .set({ status: "PRINTING" })
        .where(eq(printJobs.id, job.id));

      job.status = "PRINTING";

      wsManager.broadcastToShop(shopId, {
        type: "JOB_STATUS_UPDATED",
        data: { jobId: job.id, status: "PRINTING", pickupPin: job.pickupPin },
      });
    }

    // Fetch items
    const items = await db
      .select({
        id: printJobItems.id,
        originalFilename: printJobItems.originalFilename,
        pageCount: printJobItems.pageCount,
        pageRange: printJobItems.pageRange,
        copies: printJobItems.copies,
        colorMode: printJobItems.colorMode,
        paperSize: printJobItems.paperSize,
        isDuplex: printJobItems.isDuplex,
        itemPrice: printJobItems.itemPrice,
        fileKey: printJobItems.fileKey,
      })
      .from(printJobItems)
      .where(eq(printJobItems.jobId, job.id));

    return c.json({
      success: true,
      message: "PIN verified successfully",
      data: {
        job: {
          id: job.id,
          pickupPin: job.pickupPin,
          status: job.status,
          totalAmount: job.totalAmount,
          paymentStatus: job.paymentStatus,
          customerPhoneMasked: job.customerPhoneMasked,
          createdAt: job.createdAt,
          expiresAt: job.expiresAt,
        },
        items,
      },
    });
  } catch (err: any) {
    console.error("PIN verification error:", err);
    return c.json({ success: false, message: err.message || "Failed to verify PIN" }, 500);
  }
});

// ==========================================
// 3. Complete Job & Immediately Shred Document
// ==========================================
// POST /api/v1/shop/queue/:jobId/complete
const completeJobSchema = z.object({
  paymentStatus: z.enum(["PAID_CASH", "PAID_UPI", "UNPAID"]).default("PAID_CASH"),
});

queueRoutes.post("/:jobId/complete", async (c) => {
  const shopId = c.get("shopId");
  const jobId = c.req.param("jobId");
  const body = await c.req.json().catch(() => ({}));
  const parsed = completeJobSchema.safeParse(body);

  const paymentStatus = parsed.success ? parsed.data.paymentStatus : "PAID_CASH";

  try {
    const [job] = await db
      .select()
      .from(printJobs)
      .where(and(eq(printJobs.id, jobId), eq(printJobs.shopId, shopId)));

    if (!job) {
      return c.json({ success: false, message: "Job not found" }, 404);
    }

    // 1. Mark job as COMPLETED
    await db
      .update(printJobs)
      .set({
        status: "COMPLETED",
        paymentStatus,
        completedAt: new Date(),
      })
      .where(eq(printJobs.id, jobId));

    // 2. IMMEDIATE FILE SHREDDING
    const items = await db
      .select({ fileKey: printJobItems.fileKey })
      .from(printJobItems)
      .where(eq(printJobItems.jobId, jobId));

    for (const item of items) {
      await deleteDocument(item.fileKey);
    }

    // 3. Broadcast real-time update
    wsManager.broadcastToShop(shopId, {
      type: "JOB_COMPLETED",
      data: {
        jobId,
        pickupPin: job.pickupPin,
        completedAt: new Date().toISOString(),
      },
    });

    return c.json({
      success: true,
      message: "Job completed and documents permanently shredded from storage",
      data: {
        jobId,
        status: "COMPLETED",
        filesDeleted: items.length,
      },
    });
  } catch (err: any) {
    console.error("Job complete error:", err);
    return c.json({ success: false, message: err.message || "Failed to complete job" }, 500);
  }
});

// ==========================================
// 4. Cancel Job & Shred Document
// ==========================================
// POST /api/v1/shop/queue/:jobId/cancel
queueRoutes.post("/:jobId/cancel", async (c) => {
  const shopId = c.get("shopId");
  const jobId = c.req.param("jobId");

  try {
    const [job] = await db
      .select()
      .from(printJobs)
      .where(and(eq(printJobs.id, jobId), eq(printJobs.shopId, shopId)));

    if (!job) {
      return c.json({ success: false, message: "Job not found" }, 404);
    }

    // 1. Mark as CANCELLED
    await db
      .update(printJobs)
      .set({ status: "CANCELLED" })
      .where(eq(printJobs.id, jobId));

    // 2. Shred files
    const items = await db
      .select({ fileKey: printJobItems.fileKey })
      .from(printJobItems)
      .where(eq(printJobItems.jobId, jobId));

    for (const item of items) {
      await deleteDocument(item.fileKey);
    }

    // 3. Broadcast
    wsManager.broadcastToShop(shopId, {
      type: "JOB_CANCELLED",
      data: { jobId, pickupPin: job.pickupPin },
    });

    return c.json({
      success: true,
      message: "Job cancelled and documents removed",
    });
  } catch (err: any) {
    console.error("Job cancel error:", err);
    return c.json({ success: false, message: err.message || "Failed to cancel job" }, 500);
  }
});

