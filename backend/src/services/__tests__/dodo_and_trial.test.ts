import { describe, expect, it } from "bun:test";
import crypto from "crypto";
import { dodoService } from "../dodo.service";

describe("Dodo Service & 10-Day Free Trial", () => {
  it("calculates active 10-day trial for freshly registered shop", () => {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    const status = dodoService.calculateTrialStatus({
      createdAt: now,
      trialEndsAt,
      subscriptionStatus: "TRIAL",
      subscriptionEndsAt: null,
    });

    expect(status.status).toBe("TRIAL");
    expect(status.isTrialActive).toBe(true);
    expect(status.isSubscriptionActive).toBe(false);
    expect(status.canAccessPlatform).toBe(true);
    expect(status.trialDaysRemaining).toBeGreaterThanOrEqual(9);
    expect(status.trialDaysRemaining).toBeLessThanOrEqual(10);
  });

  it("calculates trial days remaining accurately mid-way (e.g. Day 6 of 10)", () => {
    const now = new Date();
    // 4 days left
    const trialEndsAt = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const createdAt = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    const status = dodoService.calculateTrialStatus({
      createdAt,
      trialEndsAt,
      subscriptionStatus: "TRIAL",
      subscriptionEndsAt: null,
    });

    expect(status.status).toBe("TRIAL");
    expect(status.isTrialActive).toBe(true);
    expect(status.trialDaysRemaining).toBe(4);
    expect(status.canAccessPlatform).toBe(true);
  });

  it("marks shop as EXPIRED when 10-day trial period has elapsed without payment", () => {
    const now = new Date();
    // Trial ended 2 days ago
    const trialEndsAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const createdAt = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);

    const status = dodoService.calculateTrialStatus({
      createdAt,
      trialEndsAt,
      subscriptionStatus: "TRIAL",
      subscriptionEndsAt: null,
    });

    expect(status.status).toBe("EXPIRED");
    expect(status.isTrialActive).toBe(false);
    expect(status.isSubscriptionActive).toBe(false);
    expect(status.canAccessPlatform).toBe(false);
    expect(status.trialDaysRemaining).toBe(0);
  });

  it("grants ACTIVE access when subscription is paid even if original trial date expired", () => {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    const createdAt = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const subscriptionEndsAt = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);

    const status = dodoService.calculateTrialStatus({
      createdAt,
      trialEndsAt,
      subscriptionStatus: "ACTIVE",
      subscriptionEndsAt,
    });

    expect(status.status).toBe("ACTIVE");
    expect(status.isTrialActive).toBe(false);
    expect(status.isSubscriptionActive).toBe(true);
    expect(status.canAccessPlatform).toBe(true);
  });

  it("marks shop EXPIRED when active subscription period has lapsed", () => {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
    const createdAt = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);
    const subscriptionEndsAt = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    const status = dodoService.calculateTrialStatus({
      createdAt,
      trialEndsAt,
      subscriptionStatus: "ACTIVE",
      subscriptionEndsAt,
    });

    expect(status.status).toBe("EXPIRED");
    expect(status.canAccessPlatform).toBe(false);
  });

  it("cryptographically verifies Standard Webhooks HMAC-SHA256 signature", () => {
    const rawSecret = "super_secret_test_key_123456789";
    const base64Secret = Buffer.from(rawSecret).toString("base64");
    const formattedSecret = `whsec_${base64Secret}`;

    const id = "msg_test_001";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_123" } });

    // Compute expected signature: HMAC-SHA256 of "${id}.${timestamp}.${body}"
    const signedContent = `${id}.${timestamp}.${body}`;
    const hmac = crypto
      .createHmac("sha256", Buffer.from(base64Secret, "base64"))
      .update(signedContent)
      .digest("base64");

    const validSignature = `v1,${hmac}`;

    const isValid = dodoService.verifyWebhookSignature(
      body,
      {
        id,
        timestamp,
        signature: validSignature,
      },
      formattedSecret
    );

    expect(isValid).toBe(true);
  });

  it("rejects forged or tampered webhook signatures", () => {
    const base64Secret = Buffer.from("super_secret_key").toString("base64");
    const formattedSecret = `whsec_${base64Secret}`;

    const id = "msg_test_002";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ type: "payment.succeeded" });

    const isFakeValid = dodoService.verifyWebhookSignature(
      body,
      {
        id,
        timestamp,
        signature: "v1,forged_tampered_signature_content",
      },
      formattedSecret
    );

    expect(isFakeValid).toBe(false);
  });

  it("rejects webhook if timestamp is older than 5 minutes (replay attack protection)", () => {
    const base64Secret = Buffer.from("super_secret_key").toString("base64");
    const formattedSecret = `whsec_${base64Secret}`;

    const id = "msg_test_003";
    // 10 minutes ago
    const oldTimestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000).toString();
    const body = JSON.stringify({ type: "payment.succeeded" });

    const signedContent = `${id}.${oldTimestamp}.${body}`;
    const hmac = crypto
      .createHmac("sha256", Buffer.from(base64Secret, "base64"))
      .update(signedContent)
      .digest("base64");

    const isExpiredValid = dodoService.verifyWebhookSignature(
      body,
      {
        id,
        timestamp: oldTimestamp,
        signature: `v1,${hmac}`,
      },
      formattedSecret
    );

    expect(isExpiredValid).toBe(false);
  });
});
