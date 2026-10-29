import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { verify } from "hono/jwt";
import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";
import { env } from "./config/env";
import { authRoutes } from "./modules/auth/auth.routes";
import { shopsRoutes } from "./modules/shops/shops.routes";
import { jobsRoutes } from "./modules/jobs/jobs.routes";
import { queueRoutes } from "./modules/queue/queue.routes";
import { printRoutes } from "./modules/print/print.routes";
import { ledgerRoutes } from "./modules/ledger/ledger.routes";
import { billingRoutes, billingWebhookRoutes } from "./modules/billing/billing.routes";
import { wsManager } from "./services/websocket.service";
import { startCleanerSchedule } from "./services/cleaner.service";

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

const app = new Hono();

// Global Middlewares
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*", // Allow mobile customer web and desktop shopkeeper dashboard
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "kagaz-backend",
    version: "1.0.0",
    activeShopSockets: wsManager.getActiveShopCount(),
    timestamp: new Date().toISOString(),
  });
});

// Real-time WebSocket connection for shopkeeper live queue
app.get(
  "/api/v1/queue/ws",
  upgradeWebSocket(async (c) => {
    const token = c.req.query("token");
    let shopId: string | null = null;

    if (token) {
      try {
        const payload = (await verify(token, env.JWT_SECRET, "HS256")) as any;
        shopId = payload.shopId;
      } catch (err) {
        console.warn("[WS] Connection attempted with invalid token");
      }
    }

    return {
      onOpen(event, ws) {
        if (shopId) {
          (ws as any).shopId = shopId;
          wsManager.registerShopSocket(shopId, ws);
          ws.send(JSON.stringify({ type: "CONNECTED", message: "Connected to Kagaz Live Counter Queue" }));
        } else {
          ws.send(JSON.stringify({ type: "ERROR", message: "Unauthorized: Invalid or missing token" }));
          ws.close();
        }
      },
      onClose(event, ws) {
        const id = (ws as any).shopId;
        if (id) {
          wsManager.unregisterShopSocket(id, ws);
        }
      },
      onMessage(event, ws) {
        try {
          const msg = JSON.parse(event.data.toString());
          if (msg.type === "PING") {
            ws.send(JSON.stringify({ type: "PONG" }));
          }
        } catch {}
      },
    };
  })
);

// Mount modular API routes
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/shops", shopsRoutes);
app.route("/api/v1/jobs", jobsRoutes);
app.route("/api/v1/shop/queue", queueRoutes);
app.route("/api/v1/shop/print", printRoutes);
app.route("/api/v1/shop/ledger", ledgerRoutes);
app.route("/api/v1/shop/billing", billingRoutes);
app.route("/api/v1/billing", billingWebhookRoutes);

// Global 404 handler
app.notFound((c) => {
  return c.json({ success: false, message: `Route not found: ${c.req.method} ${c.req.path}` }, 404);
});

// Global Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      success: false,
      message: err.message || "Internal Server Error",
    },
    500
  );
});

// Start background file cleanup cron (runs every 15 minutes to purge expired jobs)
startCleanerSchedule(15);

console.log(`🚀 Kagaz Backend running on Bun: http://localhost:${env.PORT}`);

export default {
  port: env.PORT,
  fetch: app.fetch,
  websocket,
};
