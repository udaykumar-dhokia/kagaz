import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./config/env";
import { authRoutes } from "./modules/auth/auth.routes";
import { shopsRoutes } from "./modules/shops/shops.routes";

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
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routes
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/shops", shopsRoutes);

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

console.log(`🚀 Kagaz Backend running on Bun: http://localhost:${env.PORT}`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
