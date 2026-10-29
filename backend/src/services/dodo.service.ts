import crypto from "crypto";
import { env } from "../config/env";

export interface CreateCheckoutOptions {
  shopId: string;
  email: string;
  name: string;
  productId?: string;
  returnUrl?: string;
  quantity?: number;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
}

export interface ShopTrialInfo {
  status: "TRIAL" | "ACTIVE" | "EXPIRED";
  isTrialActive: boolean;
  trialDaysRemaining: number;
  trialEndsAt: Date;
  isSubscriptionActive: boolean;
  subscriptionEndsAt: Date | null;
  canAccessPlatform: boolean;
}

export class DodoService {
  private apiKey: string;
  private baseUrl: string;
  private webhookSecret?: string;

  constructor() {
    this.apiKey = env.DODO_PAYMENTS_API_KEY;
    this.baseUrl =
      env.DODO_PAYMENTS_ENV === "live_mode"
        ? "https://live.dodopayments.com"
        : "https://test.dodopayments.com";
    this.webhookSecret = env.DODO_PAYMENTS_WEBHOOK_SECRET;
  }

  /**
   * Calculate 10-day trial status and active subscription access for a shop
   */
  public calculateTrialStatus(shop: {
    createdAt: Date;
    trialEndsAt?: Date | null;
    subscriptionStatus?: string | null;
    subscriptionEndsAt?: Date | null;
  }): ShopTrialInfo {
    const now = new Date();

    // Default 10-day trial window from registration
    const trialEndsAt = shop.trialEndsAt
      ? new Date(shop.trialEndsAt)
      : new Date(new Date(shop.createdAt).getTime() + 10 * 24 * 60 * 60 * 1000);

    const subscriptionEndsAt = shop.subscriptionEndsAt
      ? new Date(shop.subscriptionEndsAt)
      : null;

    const isSubscriptionActive =
      shop.subscriptionStatus === "ACTIVE" &&
      subscriptionEndsAt !== null &&
      subscriptionEndsAt > now;

    const isTrialActive =
      !isSubscriptionActive &&
      (shop.subscriptionStatus === "TRIAL" || !shop.subscriptionStatus) &&
      now <= trialEndsAt;

    let trialDaysRemaining = 0;
    if (isTrialActive) {
      const diffMs = trialEndsAt.getTime() - now.getTime();
      trialDaysRemaining = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    }

    let status: "TRIAL" | "ACTIVE" | "EXPIRED" = "EXPIRED";
    if (isSubscriptionActive) {
      status = "ACTIVE";
    } else if (isTrialActive) {
      status = "TRIAL";
    }

    return {
      status,
      isTrialActive,
      trialDaysRemaining,
      trialEndsAt,
      isSubscriptionActive,
      subscriptionEndsAt,
      canAccessPlatform: isSubscriptionActive || isTrialActive,
    };
  }

  /**
   * Fetch active products list from Dodo Payments
   */
  public async getProducts(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/products`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.warn(`[Dodo] Failed to fetch products (${res.status}): ${text}`);
        return [];
      }

      const data = await res.json();
      return Array.isArray(data) ? data : data?.items || [];
    } catch (err: any) {
      console.error("[Dodo] Error fetching products:", err?.message);
      return [];
    }
  }

  /**
   * Create a hosted Dodo Payments checkout session
   */
  public async createCheckoutSession(
    options: CreateCheckoutOptions
  ): Promise<CheckoutSessionResult> {
    let targetProductId = options.productId || env.DODO_PRODUCT_ID_MONTHLY;

    // If no explicit product ID, attempt to pick the first product in the account
    if (!targetProductId) {
      const products = await this.getProducts();
      if (products.length > 0) {
        targetProductId = products[0].product_id || products[0].id;
      }
    }

    if (!targetProductId) {
      throw new Error(
        "No Dodo product ID provided. Please specify a product ID or configure DODO_PRODUCT_ID_MONTHLY."
      );
    }

    const payload = {
      product_cart: [
        {
          product_id: targetProductId,
          quantity: options.quantity || 1,
        },
      ],
      billing_address: {
        country: "IN",
      },
      customer: {
        email: options.email,
        name: options.name,
      },
      metadata: {
        shopId: options.shopId,
        platform: "kagaz",
      },
      return_url:
        options.returnUrl || `${env.APP_BASE_URL}/dashboard?billing=success`,
    };

    const res = await fetch(`${this.baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Dodo checkout creation failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    const checkoutUrl = data.checkout_url || data.url;
    const sessionId = data.session_id || data.id;

    if (!checkoutUrl) {
      throw new Error("Dodo response missing checkout_url");
    }

    return {
      sessionId,
      checkoutUrl,
    };
  }

  /**
   * Retrieve an existing checkout session status from Dodo Payments
   */
  public async getCheckoutSession(sessionId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/checkouts/${sessionId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch checkout session (${res.status}): ${text}`);
    }

    return await res.json();
  }

  /**
   * Fetch a specific payment record by ID from Dodo Payments
   */
  public async getPayment(paymentId: string): Promise<any | null> {
    try {
      const res = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Fetch a specific subscription record by ID from Dodo Payments
   */
  public async getSubscription(subscriptionId: string): Promise<any | null> {
    try {
      const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * List recent payments from Dodo Payments
   */
  public async listPayments(pageSize = 20): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/payments?page_size=${pageSize}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.items || [];
    } catch {
      return [];
    }
  }

  /**
   * List recent subscriptions from Dodo Payments
   */
  public async listSubscriptions(pageSize = 20): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/subscriptions?page_size=${pageSize}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.items || [];
    } catch {
      return [];
    }
  }

  /**
   * Verify Standard Webhooks signature using HMAC-SHA256
   */
  public verifyWebhookSignature(
    rawBody: string,
    headers: {
      id?: string;
      timestamp?: string;
      signature?: string;
    },
    customSecret?: string
  ): boolean {
    const secret = customSecret || this.webhookSecret;
    if (!secret) {
      // If no webhook secret configured yet (e.g. initial testing), allow with warning
      console.warn(
        "[Dodo] No DODO_PAYMENTS_WEBHOOK_SECRET configured. Skipping cryptographic signature check for testing."
      );
      return true;
    }

    const { id, timestamp, signature } = headers;
    if (!id || !timestamp || !signature) {
      console.warn("[Dodo] Missing required webhook signature headers");
      return false;
    }

    // Check timestamp drift (5 minute tolerance)
    const tolerance = 5 * 60;
    const nowSec = Math.floor(Date.now() / 1000);
    const sentSec = parseInt(timestamp, 10);
    if (isNaN(sentSec) || Math.abs(nowSec - sentSec) > tolerance) {
      console.warn("[Dodo] Webhook timestamp outside acceptable tolerance");
      return false;
    }

    try {
      const signedContent = `${id}.${timestamp}.${rawBody}`;
      const cleanSecret = secret.startsWith("whsec_")
        ? secret.substring(6)
        : secret;
      const secretBuffer = Buffer.from(cleanSecret, "base64");

      const computedHmac = crypto
        .createHmac("sha256", secretBuffer)
        .update(signedContent)
        .digest("base64");

      const expectedSig = `v1,${computedHmac}`;
      const providedSignatures = signature.split(" ");

      for (const sig of providedSignatures) {
        const sigBuf = Buffer.from(sig);
        const expectedBuf = Buffer.from(expectedSig);
        if (
          sigBuf.length === expectedBuf.length &&
          crypto.timingSafeEqual(sigBuf, expectedBuf)
        ) {
          return true;
        }
      }

      console.warn("[Dodo] Webhook signature mismatch");
      return false;
    } catch (err: any) {
      console.error("[Dodo] Error verifying webhook signature:", err?.message);
      return false;
    }
  }
}

export const dodoService = new DodoService();
