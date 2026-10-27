import crypto from "crypto";
import { eq, and, gt, inArray } from "drizzle-orm";
import { db } from "../db";
import { printJobs } from "../db/schema";

export async function generateUniquePickupPin(shopId: string): Promise<string> {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate 4 digit number: 1000 to 9999
    const randomNum = crypto.randomInt(1000, 10000);
    const candidatePin = randomNum.toString();

    // Check if this PIN is currently in active use for this shop
    const [existing] = await db
      .select({ id: printJobs.id })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shopId),
          eq(printJobs.pickupPin, candidatePin),
          inArray(printJobs.status, ["PENDING", "QUEUED", "PRINTING"]),
          gt(printJobs.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!existing) {
      return candidatePin;
    }
  }

  // Fallback: 4 digit random
  return crypto.randomInt(1000, 10000).toString();
}

