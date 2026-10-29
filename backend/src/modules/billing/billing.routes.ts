import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { shops, subscriptionTransactions } from "../../db/schema";
import { requireShopAuth, type AppEnv } from "../../middlewares/auth.middleware";
import { dodoService } from "../../services/dodo.service";

export const billingRoutes = new Hono<AppEnv>();

/**
 * Reusable helper to activate or extend a shop's subscription
 */
async function activateShopSubscription(
  shopId: string,
  paymentDetails: {
    paymentId?: string | null;
    subscriptionId?: string | null;
    customerId?: string | null;
    amount?: number | string | null;
    currency?: string;
    raw?: any;
  }
) {
  const extensionDays = 30; // 1 month subscription
  const subscriptionEndsAt = new Date(Date.now() + extensionDays * 24 * 60 * 60 * 1000);

  await db
    .update(shops)
    .set({
      subscriptionStatus: "ACTIVE",
      subscriptionEndsAt,
      currentPlan: "MONTHLY",
      dodoSubscriptionId: paymentDetails.subscriptionId || null,
      dodoCustomerId: paymentDetails.customerId || null,
      updatedAt: new Date(),
    })
    .where(eq(shops.id, shopId));

  const rawAmount = paymentDetails.amount || 399;
  const parsedAmount =
    typeof rawAmount === "number" && rawAmount > 1000
      ? (rawAmount / 100).toFixed(2)
      : Number(rawAmount).toFixed(2);

  if (paymentDetails.paymentId) {
    const [existing] = await db
      .select({ id: subscriptionTransactions.id })
      .from(subscriptionTransactions)
      .where(eq(subscriptionTransactions.dodoPaymentId, paymentDetails.paymentId));

    if (!existing) {
      await db.insert(subscriptionTransactions).values({
        shopId,
        dodoPaymentId: paymentDetails.paymentId,
        dodoSubscriptionId: paymentDetails.subscriptionId || null,
        amount: parsedAmount,
        currency: paymentDetails.currency || "INR",
        status: "SUCCESS",
        planType: "MONTHLY",
        rawEvent: paymentDetails.raw ? JSON.stringify(paymentDetails.raw) : null,
      });
    }
  }

  console.log(
    `[Billing] Activated subscription for shop ${shopId} until ${subscriptionEndsAt.toISOString()}`
  );
}

// ==========================================
// 1. Get Shop Trial & Subscription Status
// ==========================================
// GET /api/v1/shop/billing/status (Protected)
billingRoutes.get("/status", requireShopAuth, async (c) => {
  try {
    const shopId = c.get("shopId");
    let [shop] = await db.select().from(shops).where(eq(shops.id, shopId));

    if (!shop) {
      return c.json({ success: false, message: "Shop not found" }, 404);
    }

    // Auto-reconciliation: If shop is not active, check Dodo Payments directly!
    // This handles local development or cases where webhook was delayed/undelivered.
    if (shop.subscriptionStatus !== "ACTIVE") {
      try {
        const recentPayments = await dodoService.listPayments(20);
        const matchingPayment = recentPayments.find(
          (p: any) =>
            (p.metadata?.shopId === shop?.id ||
              (p.customer?.email &&
                p.customer.email.toLowerCase() === shop?.ownerEmail.toLowerCase())) &&
            (p.status === "succeeded" || p.status === "paid")
        );

        if (matchingPayment) {
          await activateShopSubscription(shop.id, {
            paymentId: matchingPayment.payment_id,
            subscriptionId: matchingPayment.subscription_id,
            customerId: matchingPayment.customer?.customer_id,
            amount: matchingPayment.total_amount || matchingPayment.amount,
            currency: matchingPayment.currency,
            raw: matchingPayment,
          });
          const [updated] = await db.select().from(shops).where(eq(shops.id, shopId));
          if (updated) shop = updated;
        } else {
          const recentSubs = await dodoService.listSubscriptions(20);
          const matchingSub = recentSubs.find(
            (s: any) =>
              (s.metadata?.shopId === shop?.id ||
                (s.customer?.email &&
                  s.customer.email.toLowerCase() === shop?.ownerEmail.toLowerCase())) &&
              (s.status === "active" || s.status === "on_trial")
          );

          if (matchingSub) {
            await activateShopSubscription(shop.id, {
              subscriptionId: matchingSub.subscription_id,
              customerId: matchingSub.customer?.customer_id,
              raw: matchingSub,
            });
            const [updated] = await db.select().from(shops).where(eq(shops.id, shopId));
            if (updated) shop = updated;
          }
        }
      } catch (err: any) {
        console.warn("[Billing] Auto-reconciliation check error:", err?.message);
      }
    }

    const trialInfo = dodoService.calculateTrialStatus(shop);

    // Fetch most recent transaction if available
    const [lastTransaction] = await db
      .select({
        id: subscriptionTransactions.id,
        amount: subscriptionTransactions.amount,
        currency: subscriptionTransactions.currency,
        status: subscriptionTransactions.status,
        planType: subscriptionTransactions.planType,
        createdAt: subscriptionTransactions.createdAt,
      })
      .from(subscriptionTransactions)
      .where(eq(subscriptionTransactions.shopId, shopId))
      .orderBy(desc(subscriptionTransactions.createdAt))
      .limit(1);

    return c.json({
      success: true,
      data: {
        ...trialInfo,
        currentPlan: shop.currentPlan || (trialInfo.isTrialActive ? "FREE_TRIAL" : "MONTHLY"),
        lastTransaction: lastTransaction || null,
      },
    });
  } catch (err: any) {
    console.error("[Billing] Error fetching status:", err);
    return c.json(
      { success: false, message: err?.message || "Failed to fetch billing status" },
      500
    );
  }
});

// ==========================================
// 2. Create Dodo Checkout Session
// ==========================================
// POST /api/v1/shop/billing/checkout (Protected)
billingRoutes.post("/checkout", requireShopAuth, async (c) => {
  try {
    const shopId = c.get("shopId");
    const body = await c.req.json().catch(() => ({}));

    const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
    if (!shop) {
      return c.json({ success: false, message: "Shop not found" }, 404);
    }

    const session = await dodoService.createCheckoutSession({
      shopId: shop.id,
      email: shop.ownerEmail,
      name: shop.name,
      productId: body.productId,
      returnUrl: body.returnUrl,
    });

    return c.json({
      success: true,
      data: session,
    });
  } catch (err: any) {
    console.error("[Billing] Error creating checkout session:", err);
    return c.json(
      { success: false, message: err?.message || "Failed to initiate payment checkout" },
      500
    );
  }
});

// ==========================================
// 3. Verify Payment Status Manually / From Return URL
// ==========================================
// POST /api/v1/shop/billing/verify (Protected)
billingRoutes.post("/verify", requireShopAuth, async (c) => {
  try {
    const shopId = c.get("shopId");
    const body = await c.req.json().catch(() => ({}));
    let [shop] = await db.select().from(shops).where(eq(shops.id, shopId));

    if (!shop) {
      return c.json({ success: false, message: "Shop not found" }, 404);
    }

    if (body.paymentId) {
      const payment = await dodoService.getPayment(body.paymentId);
      if (payment && (payment.status === "succeeded" || payment.status === "paid")) {
        await activateShopSubscription(shop.id, {
          paymentId: payment.payment_id,
          subscriptionId: payment.subscription_id,
          customerId: payment.customer?.customer_id,
          amount: payment.total_amount || payment.amount,
          currency: payment.currency,
          raw: payment,
        });
      }
    } else if (body.subscriptionId) {
      const sub = await dodoService.getSubscription(body.subscriptionId);
      if (sub && (sub.status === "active" || sub.status === "on_trial")) {
        await activateShopSubscription(shop.id, {
          subscriptionId: sub.subscription_id,
          customerId: sub.customer?.customer_id,
          raw: sub,
        });
      }
    } else {
      const recentPayments = await dodoService.listPayments(20);
      const matchingPayment = recentPayments.find(
        (p: any) =>
          (p.metadata?.shopId === shop.id ||
            (p.customer?.email &&
              p.customer.email.toLowerCase() === shop.ownerEmail.toLowerCase())) &&
          (p.status === "succeeded" || p.status === "paid")
      );

      if (matchingPayment) {
        await activateShopSubscription(shop.id, {
          paymentId: matchingPayment.payment_id,
          subscriptionId: matchingPayment.subscription_id,
          customerId: matchingPayment.customer?.customer_id,
          amount: matchingPayment.total_amount || matchingPayment.amount,
          currency: matchingPayment.currency,
          raw: matchingPayment,
        });
      } else {
        const recentSubs = await dodoService.listSubscriptions(20);
        const matchingSub = recentSubs.find(
          (s: any) =>
            (s.metadata?.shopId === shop.id ||
              (s.customer?.email &&
                s.customer.email.toLowerCase() === shop.ownerEmail.toLowerCase())) &&
            (s.status === "active" || s.status === "on_trial")
        );

        if (matchingSub) {
          await activateShopSubscription(shop.id, {
            subscriptionId: matchingSub.subscription_id,
            customerId: matchingSub.customer?.customer_id,
            raw: matchingSub,
          });
        }
      }
    }

    const [updatedShop] = await db.select().from(shops).where(eq(shops.id, shopId));
    const trialInfo = dodoService.calculateTrialStatus(updatedShop || shop);

    return c.json({
      success: true,
      message: trialInfo.isSubscriptionActive ? "Subscription is active" : "Status refreshed",
      data: trialInfo,
    });
  } catch (err: any) {
    console.error("[Billing] Verification error:", err);
    return c.json(
      { success: false, message: err?.message || "Failed to verify payment status" },
      500
    );
  }
});

// ==========================================
// 4. Dodo Payments Webhook Receiver
// ==========================================
// POST /api/v1/billing/webhook (Public with signature check)
export const billingWebhookRoutes = new Hono();

billingWebhookRoutes.post("/webhook", async (c) => {
  try {
    const rawBody = await c.req.text();

    const headers = {
      id: c.req.header("webhook-id"),
      timestamp: c.req.header("webhook-timestamp"),
      signature: c.req.header("webhook-signature"),
    };

    const isValid = dodoService.verifyWebhookSignature(rawBody, headers);
    if (!isValid) {
      return c.json({ error: "Invalid webhook signature" }, 401);
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const eventType = payload.type || payload.event;
    const eventData = payload.data || {};
    console.log(`[Dodo Webhook] Received verified event: ${eventType}`);

    const metadata = eventData.metadata || {};
    let shopId = metadata.shopId;

    if (!shopId && eventData.customer?.email) {
      const [matchedShop] = await db
        .select({ id: shops.id })
        .from(shops)
        .where(eq(shops.ownerEmail, eventData.customer.email.toLowerCase()));
      if (matchedShop) {
        shopId = matchedShop.id;
      }
    }

    switch (eventType) {
      case "payment.succeeded": {
        if (shopId) {
          await activateShopSubscription(shopId, {
            paymentId: eventData.payment_id,
            subscriptionId: eventData.subscription_id,
            customerId: eventData.customer?.customer_id,
            amount: eventData.total_amount || eventData.amount,
            currency: eventData.currency,
            raw: eventData,
          });
        }
        break;
      }

      case "subscription.active":
      case "subscription.renewed": {
        if (shopId) {
          await activateShopSubscription(shopId, {
            subscriptionId: eventData.subscription_id,
            customerId: eventData.customer?.customer_id,
            raw: eventData,
          });
        }
        break;
      }

      case "subscription.cancelled":
      case "subscription.expired":
      case "subscription.on_hold": {
        if (shopId) {
          await db
            .update(shops)
            .set({
              subscriptionStatus: "EXPIRED",
              updatedAt: new Date(),
            })
            .where(eq(shops.id, shopId));

          console.log(`[Dodo Webhook] Marked subscription EXPIRED for shop ${shopId}`);
        }
        break;
      }

      default:
        console.log(`[Dodo Webhook] Unhandled event type: ${eventType}`);
    }

    return c.json({ received: true });
  } catch (err: any) {
    console.error("[Dodo Webhook] Processing error:", err);
    return c.json({ error: "Internal webhook processing error" }, 500);
  }
});
