import { Hono } from "hono";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import { printJobs, printJobItems } from "../../db/schema";
import { requireShopAuth, type AppEnv } from "../../middlewares/auth.middleware";

export const ledgerRoutes = new Hono<AppEnv>();

ledgerRoutes.use("*", requireShopAuth);

// ==========================================
// 1. Daily Revenue & Print Analytics
// ==========================================
// GET /api/v1/shop/ledger/daily?date=YYYY-MM-DD
ledgerRoutes.get("/daily", async (c) => {
  const shopId = c.get("shopId");
  const dateParam = c.req.query("date");

  // Determine start and end of target day
  const targetDate = dateParam ? new Date(dateParam) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    // 1. Fetch completed jobs for today
    const completedJobs = await db
      .select({
        id: printJobs.id,
        totalAmount: printJobs.totalAmount,
        paymentStatus: printJobs.paymentStatus,
        completedAt: printJobs.completedAt,
      })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shopId),
          eq(printJobs.status, "COMPLETED"),
          gte(printJobs.completedAt, startOfDay),
          lte(printJobs.completedAt, endOfDay)
        )
      );

    // 2. Fetch line items for completed jobs to calculate page counts
    let totalRevenue = 0;
    let cashCollected = 0;
    let upiCollected = 0;
    let unpaidAmount = 0;

    for (const job of completedJobs) {
      const amount = Number(job.totalAmount);
      totalRevenue += amount;

      if (job.paymentStatus === "PAID_CASH") cashCollected += amount;
      else if (job.paymentStatus === "PAID_UPI") upiCollected += amount;
      else unpaidAmount += amount;
    }

    // 3. Page counts breakdown
    const jobIds = completedJobs.map((j) => j.id);
    let totalPages = 0;
    let bwPages = 0;
    let colorPages = 0;

    if (jobIds.length > 0) {
      const items = await db
        .select({
          pageCount: printJobItems.pageCount,
          copies: printJobItems.copies,
          colorMode: printJobItems.colorMode,
        })
        .from(printJobItems);

      // Filter in-memory for the completed jobs of today
      for (const item of items) {
        const pages = item.pageCount * item.copies;
        totalPages += pages;
        if (item.colorMode === "COLOR") colorPages += pages;
        else bwPages += pages;
      }
    }

    // 4. Count active jobs currently in queue
    const activeJobs = await db
      .select({ id: printJobs.id })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shopId),
          eq(printJobs.status, "QUEUED")
        )
      );

    return c.json({
      success: true,
      data: {
        date: startOfDay.toISOString().split("T")[0],
        summary: {
          totalJobsCompleted: completedJobs.length,
          activeQueueCount: activeJobs.length,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          cashCollected: Number(cashCollected.toFixed(2)),
          upiCollected: Number(upiCollected.toFixed(2)),
          unpaidAmount: Number(unpaidAmount.toFixed(2)),
          totalPagesPrinted: totalPages,
          bwPagesPrinted: bwPages,
          colorPagesPrinted: colorPages,
        },
      },
    });
  } catch (err: any) {
    console.error("Daily ledger error:", err);
    return c.json({ success: false, message: err.message || "Failed to calculate daily ledger" }, 500);
  }
});

// ==========================================
// 2. Completed Job History (Paginated)
// ==========================================
// GET /api/v1/shop/ledger/history?limit=30&offset=0
ledgerRoutes.get("/history", async (c) => {
  const shopId = c.get("shopId");
  const limit = Math.min(parseInt(c.req.query("limit") || "30", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  try {
    const historyJobs = await db
      .select({
        id: printJobs.id,
        pickupPin: printJobs.pickupPin,
        status: printJobs.status,
        totalAmount: printJobs.totalAmount,
        paymentStatus: printJobs.paymentStatus,
        customerPhoneMasked: printJobs.customerPhoneMasked,
        completedAt: printJobs.completedAt,
        createdAt: printJobs.createdAt,
      })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shopId),
          eq(printJobs.status, "COMPLETED")
        )
      )
      .orderBy(desc(printJobs.completedAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      success: true,
      data: {
        jobs: historyJobs,
        pagination: {
          limit,
          offset,
          count: historyJobs.length,
        },
      },
    });
  } catch (err: any) {
    console.error("Ledger history error:", err);
    return c.json({ success: false, message: err.message || "Failed to fetch history" }, 500);
  }
});

// ==========================================
// 3. Quick Payment Status Toggle
// ==========================================
// PATCH /api/v1/shop/ledger/:jobId/payment
const updatePaymentSchema = z.object({
  paymentStatus: z.enum(["PAID_CASH", "PAID_UPI", "UNPAID"]),
});

ledgerRoutes.patch("/:jobId/payment", async (c) => {
  const shopId = c.get("shopId");
  const jobId = c.req.param("jobId");
  const body = await c.req.json();
  const parsed = updatePaymentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, errors: parsed.error.flatten().fieldErrors }, 400);
  }

  try {
    const [updated] = await db
      .update(printJobs)
      .set({ paymentStatus: parsed.data.paymentStatus })
      .where(and(eq(printJobs.id, jobId), eq(printJobs.shopId, shopId)))
      .returning();

    if (!updated) {
      return c.json({ success: false, message: "Job not found" }, 404);
    }

    return c.json({
      success: true,
      message: `Payment status updated to ${parsed.data.paymentStatus}`,
      data: {
        jobId: updated.id,
        paymentStatus: updated.paymentStatus,
      },
    });
  } catch (err: any) {
    console.error("Update payment error:", err);
    return c.json({ success: false, message: err.message || "Failed to update payment status" }, 500);
  }
});

