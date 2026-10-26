import type { Context, Next } from "hono";
import { verify, sign } from "hono/jwt";
import { env } from "../config/env";

export interface ShopTokenPayload {
  shopId: string;
  email: string;
  slug: string;
  exp?: number;
}

export type AppEnv = {
  Variables: {
    shopId: string;
    shopEmail: string;
    shopSlug: string;
  };
};

export async function createShopToken(payload: Omit<ShopTokenPayload, "exp">): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days
  return await sign({ ...payload, exp }, env.JWT_SECRET, "HS256");
}

export async function requireShopAuth(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, message: "Authorization token required" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = (await verify(token, env.JWT_SECRET, "HS256")) as unknown as ShopTokenPayload;
    c.set("shopId", payload.shopId);
    c.set("shopEmail", payload.email);
    c.set("shopSlug", payload.slug);
    await next();
  } catch (error) {
    return c.json({ success: false, message: "Invalid or expired token" }, 401);
  }
}

