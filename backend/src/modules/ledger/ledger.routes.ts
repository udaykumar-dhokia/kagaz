import { Hono } from "hono";
import { eq, and, gte, lte, desc, asc, inArray, sql, or, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import { printJobs, printJobItems } from "../../db/schema";
import { requireShopAuth, type AppEnv } from "../../middlewares/auth.middleware";

export const ledgerRoutes = new Hono<AppEnv>();

ledgerRoutes.use("*", requireShopAuth);

/**
 * Helper to compute [startOfDay, endOfDay] from range or dates
 */
function resolveDateRange(range?: string, startDate?: string, endDate?: string): { start: Date; end: Date; isSingleDay: boolean } {
  const now = new Date();

  if (range === "yesterday") {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const start = new Date(y);
    start.setHours(0, 0, 0, 0);
    const end = new Date(y);
    end.setHours(23, 59, 59, 999);
    return { start, end, isSingleDay: true };
  }

  if (range === "7d") {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, isSingleDay: false };
  }

  if (range === "30d") {
    const start = new Date();
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, isSingleDay: false };
  }

  if (range === "custom" && startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return { start, end, isSingleDay: diffDays <= 1 };
  }

  // Default: Today
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end, isSingleDay: true };
}

// ==========================================
// 1. Comprehensive Analytics & Visual Chart Data
// ==========================================
// GET /api/v1/shop/ledger/analytics?range=7d&paymentStatus=ALL
ledgerRoutes.get("/analytics", async (c) => {
  const shopId = c.get("shopId");
  const range = c.req.query("range") || "today";
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const paymentFilter = c.req.query("paymentStatus") || "ALL";

  const { start, end, isSingleDay } = resolveDateRange(range, startDate, endDate);

  try {
    // 1. Build where conditions
    const conditions = [
      eq(printJobs.shopId, shopId),
      eq(printJobs.status, "COMPLETED"),
      gte(printJobs.completedAt, start),
      lte(printJobs.completedAt, end),
    ];

    if (paymentFilter !== "ALL") {
      conditions.push(eq(printJobs.paymentStatus, paymentFilter));
    }

    // 2. Fetch all completed jobs in range
    const completedJobs = await db
      .select({
        id: printJobs.id,
        pickupPin: printJobs.pickupPin,
        totalAmount: printJobs.totalAmount,
        paymentStatus: printJobs.paymentStatus,
        completedAt: printJobs.completedAt,
      })
      .from(printJobs)
      .where(and(...conditions))
      .orderBy(asc(printJobs.completedAt));

    // 3. Fetch items for these jobs to calculate page distributions
    const jobIds = completedJobs.map((j) => j.id);
    let itemsByJobId = new Map<string, Array<{ pageCount: number; copies: number; colorMode: string; isDuplex: boolean }>>();

    if (jobIds.length > 0) {
      const items = await db
        .select({
          jobId: printJobItems.jobId,
          pageCount: printJobItems.pageCount,
          copies: printJobItems.copies,
          colorMode: printJobItems.colorMode,
          isDuplex: printJobItems.isDuplex,
        })
        .from(printJobItems)
        .where(inArray(printJobItems.jobId, jobIds));

      for (const it of items) {
        const list = itemsByJobId.get(it.jobId) || [];
        list.push(it);
        itemsByJobId.set(it.jobId, list);
      }
    }

    // 4. Calculate aggregates
    let totalRevenue = 0;
    let cashCollected = 0;
    let upiCollected = 0;
    let unpaidAmount = 0;
    let totalPagesPrinted = 0;
    let bwPagesPrinted = 0;
    let colorPagesPrinted = 0;
    let duplexSheetsPrinted = 0;

    for (const job of completedJobs) {
      const amt = Number(job.totalAmount);
      totalRevenue += amt;

      if (job.paymentStatus === "PAID_CASH") cashCollected += amt;
      else if (job.paymentStatus === "PAID_UPI") upiCollected += amt;
      else unpaidAmount += amt;

      const jobItems = itemsByJobId.get(job.id) || [];
      for (const it of jobItems) {
        const pages = it.pageCount * it.copies;
        totalPagesPrinted += pages;
        if (it.colorMode === "COLOR") colorPagesPrinted += pages;
        else bwPagesPrinted += pages;

        if (it.isDuplex) {
          duplexSheetsPrinted += Math.ceil(pages / 2);
        }
      }
    }

    const totalJobsCompleted = completedJobs.length;
    const averageOrderValue = totalJobsCompleted > 0 ? Number((totalRevenue / totalJobsCompleted).toFixed(2)) : 0;

    // 5. Build Timeline Chart Data
    interface TimelinePoint {
      key: string;
      label: string;
      date?: string;
      revenue: number;
      orders: number;
      cash: number;
      upi: number;
      bwPages: number;
      colorPages: number;
    }

    const timelineMap = new Map<string, TimelinePoint>();

    if (isSingleDay) {
      // Hourly buckets: 00:00 to 23:00 (active shop hours)
      for (let h = 0; h < 24; h++) {
        const hh = h.toString().padStart(2, "0");
        const key = `${hh}:00`;
        const hour12 = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
        timelineMap.set(key, {
          key,
          label: hour12,
          revenue: 0,
          orders: 0,
          cash: 0,
          upi: 0,
          bwPages: 0,
          colorPages: 0,
        });
      }

      for (const job of completedJobs) {
        if (!job.completedAt) continue;
        const d = new Date(job.completedAt);
        const hh = d.getHours().toString().padStart(2, "0");
        const key = `${hh}:00`;
        const pt = timelineMap.get(key);
        if (pt) {
          const amt = Number(job.totalAmount);
          pt.revenue = Number((pt.revenue + amt).toFixed(2));
          pt.orders += 1;
          if (job.paymentStatus === "PAID_CASH") pt.cash = Number((pt.cash + amt).toFixed(2));
          else if (job.paymentStatus === "PAID_UPI") pt.upi = Number((pt.upi + amt).toFixed(2));

          const jobItems = itemsByJobId.get(job.id) || [];
          for (const it of jobItems) {
            const pages = it.pageCount * it.copies;
            if (it.colorMode === "COLOR") pt.colorPages += pages;
            else pt.bwPages += pages;
          }
        }
      }
    } else {
      // Daily buckets from start to end
      const curr = new Date(start);
      while (curr <= end) {
        const yyyy = curr.getFullYear();
        const mm = (curr.getMonth() + 1).toString().padStart(2, "0");
        const dd = curr.getDate().toString().padStart(2, "0");
        const key = `${yyyy}-${mm}-${dd}`;
        const label = curr.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

        timelineMap.set(key, {
          key,
          label,
          date: key,
          revenue: 0,
          orders: 0,
          cash: 0,
          upi: 0,
          bwPages: 0,
          colorPages: 0,
        });

        curr.setDate(curr.getDate() + 1);
      }

      for (const job of completedJobs) {
        if (!job.completedAt) continue;
        const d = new Date(job.completedAt);
        const yyyy = d.getFullYear();
        const mm = (d.getMonth() + 1).toString().padStart(2, "0");
        const dd = d.getDate().toString().padStart(2, "0");
        const key = `${yyyy}-${mm}-${dd}`;
        const pt = timelineMap.get(key);
        if (pt) {
          const amt = Number(job.totalAmount);
          pt.revenue = Number((pt.revenue + amt).toFixed(2));
          pt.orders += 1;
          if (job.paymentStatus === "PAID_CASH") pt.cash = Number((pt.cash + amt).toFixed(2));
          else if (job.paymentStatus === "PAID_UPI") pt.upi = Number((pt.upi + amt).toFixed(2));

          const jobItems = itemsByJobId.get(job.id) || [];
          for (const it of jobItems) {
            const pages = it.pageCount * it.copies;
            if (it.colorMode === "COLOR") pt.colorPages += pages;
            else pt.bwPages += pages;
          }
        }
      }
    }

    const timeline = Array.from(timelineMap.values());

    // 6. Find Peak Hour
    let peakHour = "N/A";
    let maxOrdersInHour = 0;
    if (isSingleDay) {
      for (const pt of timeline) {
        if (pt.orders > maxOrdersInHour) {
          maxOrdersInHour = pt.orders;
          peakHour = `${pt.label} (${pt.orders} orders)`;
        }
      }
    }

    // 7. Calculate Percentages
    const cashPercentage = totalRevenue > 0 ? Math.round((cashCollected / totalRevenue) * 100) : 0;
    const upiPercentage = totalRevenue > 0 ? Math.round((upiCollected / totalRevenue) * 100) : 0;
    const unpaidPercentage = totalRevenue > 0 ? Math.round((unpaidAmount / totalRevenue) * 100) : 0;

    const bwPercentage = totalPagesPrinted > 0 ? Math.round((bwPagesPrinted / totalPagesPrinted) * 100) : 0;
    const colorPercentage = totalPagesPrinted > 0 ? Math.round((colorPagesPrinted / totalPagesPrinted) * 100) : 0;

    return c.json({
      success: true,
      data: {
        range,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        isSingleDay,
        summary: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          cashCollected: Number(cashCollected.toFixed(2)),
          upiCollected: Number(upiCollected.toFixed(2)),
          unpaidAmount: Number(unpaidAmount.toFixed(2)),
          totalJobsCompleted,
          averageOrderValue,
          totalPagesPrinted,
          bwPagesPrinted,
          colorPagesPrinted,
          duplexSheetsPrinted,
        },
        timeline,
        breakdown: {
          cashPercentage,
          upiPercentage,
          unpaidPercentage,
          bwPercentage,
          colorPercentage,
          peakHour,
        },
      },
    });
  } catch (err: any) {
    console.error("Ledger analytics error:", err);
    return c.json({ success: false, message: err.message || "Failed to calculate analytics" }, 500);
  }
});

// ==========================================
// 2. Daily Summary (Backwards Compatibility)
// ==========================================
// GET /api/v1/shop/ledger/daily?date=YYYY-MM-DD
ledgerRoutes.get("/daily", async (c) => {
  const shopId = c.get("shopId");
  const dateParam = c.req.query("date");

  const targetDate = dateParam ? new Date(dateParam) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
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
        .from(printJobItems)
        .where(inArray(printJobItems.jobId, jobIds));

      for (const item of items) {
        const pages = item.pageCount * item.copies;
        totalPages += pages;
        if (item.colorMode === "COLOR") colorPages += pages;
        else bwPages += pages;
      }
    }

    const activeJobs = await db
      .select({ id: printJobs.id })
      .from(printJobs)
      .where(and(eq(printJobs.shopId, shopId), eq(printJobs.status, "QUEUED")));

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
// 3. Filtered & Paginated Completed Orders History
// ==========================================
// GET /api/v1/shop/ledger/history?range=7d&paymentStatus=ALL&search=4433&limit=15&offset=0
ledgerRoutes.get("/history", async (c) => {
  const shopId = c.get("shopId");
  const range = c.req.query("range");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const paymentFilter = c.req.query("paymentStatus");
  const searchQuery = c.req.query("search")?.trim();
  const sortBy = c.req.query("sortBy") || "recent";

  const limit = Math.min(parseInt(c.req.query("limit") || "15", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  try {
    const conditions = [
      eq(printJobs.shopId, shopId),
      eq(printJobs.status, "COMPLETED"),
    ];

    // Optional date range
    if (range && range !== "all") {
      const { start, end } = resolveDateRange(range, startDate, endDate);
      conditions.push(gte(printJobs.completedAt, start));
      conditions.push(lte(printJobs.completedAt, end));
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(gte(printJobs.completedAt, start));
      conditions.push(lte(printJobs.completedAt, end));
    }

    // Optional payment status filter
    if (paymentFilter && paymentFilter !== "ALL") {
      conditions.push(eq(printJobs.paymentStatus, paymentFilter));
    }

    // Optional search filter (matches pickupPin or customerPhoneMasked)
    if (searchQuery) {
      conditions.push(
        or(
          like(printJobs.pickupPin, `%${searchQuery}%`),
          like(printJobs.customerPhoneMasked, `%${searchQuery}%`)
        )!
      );
    }

    // Ordering
    let orderByClause = desc(printJobs.completedAt);
    if (sortBy === "amount_desc") {
      orderByClause = desc(printJobs.totalAmount);
    } else if (sortBy === "amount_asc") {
      orderByClause = asc(printJobs.totalAmount);
    } else if (sortBy === "recent") {
      orderByClause = desc(printJobs.completedAt);
    }

    // Query matching jobs
    const matchedJobs = await db
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
      .where(and(...conditions))
      .orderBy(orderByClause);

    const totalCount = matchedJobs.length;
    const paginatedJobs = matchedJobs.slice(offset, offset + limit);

    // Fetch line items for the paginated slice
    const sliceIds = paginatedJobs.map((j) => j.id);
    const itemsMap = new Map<string, any[]>();

    if (sliceIds.length > 0) {
      const items = await db
        .select({
          id: printJobItems.id,
          jobId: printJobItems.jobId,
          originalFilename: printJobItems.originalFilename,
          pageCount: printJobItems.pageCount,
          pageRange: printJobItems.pageRange,
          copies: printJobItems.copies,
          colorMode: printJobItems.colorMode,
          paperSize: printJobItems.paperSize,
          isDuplex: printJobItems.isDuplex,
          itemPrice: printJobItems.itemPrice,
        })
        .from(printJobItems)
        .where(inArray(printJobItems.jobId, sliceIds));

      for (const it of items) {
        const list = itemsMap.get(it.jobId) || [];
        list.push(it);
        itemsMap.set(it.jobId, list);
      }
    }

    const enrichedJobs = paginatedJobs.map((job) => ({
      ...job,
      items: itemsMap.get(job.id) || [],
    }));

    return c.json({
      success: true,
      data: {
        jobs: enrichedJobs,
        pagination: {
          limit,
          offset,
          count: enrichedJobs.length,
          totalCount,
        },
      },
    });
  } catch (err: any) {
    console.error("Ledger history error:", err);
    return c.json({ success: false, message: err.message || "Failed to fetch history" }, 500);
  }
});

// ==========================================
// 4. Quick Payment Status Toggle
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
