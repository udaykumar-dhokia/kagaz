import { eq, and, lt, notInArray } from "drizzle-orm";
import { db } from "../db";
import { printJobs, printJobItems } from "../db/schema";
import { deleteDocument } from "./storage.service";

/**
 * Searches for all expired jobs that were never completed or cancelled,
 * deletes their uploaded documents from Cloudinary/storage,
 * and marks them as EXPIRED in the database.
 */
export async function purgeExpiredDocuments(): Promise<number> {
  const now = new Date();

  try {
    // Find expired jobs
    const expiredJobs = await db
      .select({
        id: printJobs.id,
        shopId: printJobs.shopId,
      })
      .from(printJobs)
      .where(
        and(
          lt(printJobs.expiresAt, now),
          notInArray(printJobs.status, ["COMPLETED", "CANCELLED", "EXPIRED"])
        )
      )
      .catch((err) => {
        console.warn("[Cleaner] Database is not connected, skipping cleanup cycle.");
        return [];
      });

    if (expiredJobs.length === 0) {
      return 0;
    }

    console.log(`[Cleaner] Found ${expiredJobs.length} expired jobs to purge.`);

    for (const job of expiredJobs) {
      // Find all file items for this job
      const items = await db
        .select({
          id: printJobItems.id,
          fileKey: printJobItems.fileKey,
        })
        .from(printJobItems)
        .where(eq(printJobItems.jobId, job.id));

      // Shred each file from storage
      for (const item of items) {
        await deleteDocument(item.fileKey);
      }

      // Update status to EXPIRED
      await db
        .update(printJobs)
        .set({ status: "EXPIRED" })
        .where(eq(printJobs.id, job.id));
    }

    console.log(`[Cleaner] Successfully purged ${expiredJobs.length} expired print jobs and documents.`);
    return expiredJobs.length;
  } catch (err) {
    console.error("[Cleaner] Error during document purge:", err);
    return 0;
  }
}

/**
 * Starts a recurring interval timer to run the cleaner every N minutes.
 */
export function startCleanerSchedule(intervalMinutes: number = 15) {
  // Run once on startup (gracefully handle if DB is connecting)
  purgeExpiredDocuments().catch((err) => {
    console.warn("[Cleaner] Database not yet reachable on startup, will retry on schedule:", err?.message || err);
  });

  // Run on interval
  const intervalMs = intervalMinutes * 60 * 1000;
  const timer = setInterval(() => {
    purgeExpiredDocuments().catch((err) => {
      console.warn("[Cleaner] Scheduled purge failed:", err?.message || err);
    });
  }, intervalMs);

  return timer;
}

