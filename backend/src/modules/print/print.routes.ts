import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import { printJobs, printJobItems } from "../../db/schema";
import { requireShopAuth, requireActiveCounter, type AppEnv } from "../../middlewares/auth.middleware";
import { getFileBuffer } from "../../services/storage.service";
import { wsManager } from "../../services/websocket.service";
import { env } from "../../config/env";

export const printRoutes = new Hono<AppEnv>();

// Protect all print routes with shop authentication and active counter status
printRoutes.use("*", requireShopAuth);
printRoutes.use("*", requireActiveCounter);

// ==========================================
// 1. In-Memory Print Stream (Zero-Disk-Download)
// ==========================================
// GET /api/v1/shop/print/:jobId/stream?itemId=...
printRoutes.get("/:jobId/stream", async (c) => {
  const shopId = c.get("shopId");
  const jobId = c.req.param("jobId");
  const itemId = c.req.query("itemId");

  try {
    // 1. Verify job belongs to this shop
    const [job] = await db
      .select({ id: printJobs.id, status: printJobs.status })
      .from(printJobs)
      .where(and(eq(printJobs.id, jobId), eq(printJobs.shopId, shopId)));

    if (!job) {
      return c.json({ success: false, message: "Print job not found" }, 404);
    }

    // 2. Fetch the line item
    const itemQuery = db
      .select({
        id: printJobItems.id,
        fileKey: printJobItems.fileKey,
        originalFilename: printJobItems.originalFilename,
      })
      .from(printJobItems)
      .where(eq(printJobItems.jobId, jobId));

    const items = await itemQuery;
    if (items.length === 0) {
      return c.json({ success: false, message: "No documents attached to this job" }, 404);
    }

    const targetItem = itemId ? items.find((i) => i.id === itemId) || items[0]! : items[0]!;

    // 3. Read buffer into memory
    const buffer = await getFileBuffer(targetItem.fileKey);

    // 4. Return inline stream with strict anti-caching headers
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(targetItem.originalFilename)}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("Print stream error:", err);
    return c.json({ success: false, message: err.message || "Failed to stream document" }, 500);
  }
});

// ==========================================
// 2. Trigger Silent Hardware Spooling to Desktop Agent
// ==========================================
// POST /api/v1/shop/print/:jobId/spool
const spoolSchema = z.object({
  printerName: z.string().optional(),
});

printRoutes.post("/:jobId/spool", async (c) => {
  const shopId = c.get("shopId");
  const jobId = c.req.param("jobId");
  const body = await c.req.json().catch(() => ({}));
  const parsed = spoolSchema.safeParse(body);

  try {
    const [job] = await db
      .select()
      .from(printJobs)
      .where(and(eq(printJobs.id, jobId), eq(printJobs.shopId, shopId)));

    if (!job) {
      return c.json({ success: false, message: "Print job not found" }, 404);
    }

    const items = await db
      .select()
      .from(printJobItems)
      .where(eq(printJobItems.jobId, jobId));

    // Update job status to PRINTING
    await db
      .update(printJobs)
      .set({ status: "PRINTING" })
      .where(eq(printJobs.id, jobId));

    // Prepare spool command payload for local desktop agent
    const spoolPayload = {
      type: "JOB_STATUS_UPDATED" as const,
      data: {
        action: "PRINT_SPOOL",
        jobId: job.id,
        pickupPin: job.pickupPin,
        printerName: parsed.success ? parsed.data.printerName : undefined,
        items: items.map((it) => ({
          itemId: it.id,
          filename: it.originalFilename,
          copies: it.copies,
          colorMode: it.colorMode,
          paperSize: it.paperSize,
          isDuplex: it.isDuplex,
          pageRange: it.pageRange,
          streamUrl: `http://localhost:${env.PORT}/api/v1/shop/print/${job.id}/stream?itemId=${it.id}`,
        })),
      },
    };

    // Broadcast to local Kagaz desktop agent
    wsManager.broadcastToShop(shopId, spoolPayload);

    return c.json({
      success: true,
      message: "Print command dispatched to local print agent",
      data: {
        jobId: job.id,
        status: "PRINTING",
        itemsCount: items.length,
      },
    });
  } catch (err: any) {
    console.error("Spool command error:", err);
    return c.json({ success: false, message: err.message || "Failed to dispatch spool command" }, 500);
  }
});

