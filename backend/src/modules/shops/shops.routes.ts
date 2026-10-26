import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import { shops, shopPrintSettings, shopAddons } from "../../db/schema";
import { requireShopAuth, type AppEnv } from "../../middlewares/auth.middleware";
import { generateShopQr } from "../../services/qr.service";

export const shopsRoutes = new Hono<AppEnv>();

// ==========================================
// 1. PUBLIC: Customer reads Shop Catalog
// ==========================================
// GET /api/v1/shops/:slug/catalog
shopsRoutes.get("/:slug/catalog", async (c) => {
  const slug = c.req.param("slug");

  const [shop] = await db
    .select({
      id: shops.id,
      name: shops.name,
      slug: shops.slug,
      isActive: shops.isActive,
    })
    .from(shops)
    .where(eq(shops.slug, slug));

  if (!shop || !shop.isActive) {
    return c.json({ success: false, message: "Shop not found or currently offline" }, 404);
  }

  // Fetch capabilities & rates
  const [settings] = await db.select().from(shopPrintSettings).where(eq(shopPrintSettings.shopId, shop.id));

  // Fetch active add-ons (Spiral binding, lamination, etc.)
  const addons = await db
    .select({
      id: shopAddons.id,
      name: shopAddons.name,
      type: shopAddons.type,
      price: shopAddons.price,
    })
    .from(shopAddons)
    .where(and(eq(shopAddons.shopId, shop.id), eq(shopAddons.isActive, true)));

  return c.json({
    success: true,
    data: {
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
      },
      catalog: {
        isBwEnabled: settings?.isBwEnabled ?? true,
        bwSinglePrice: settings?.bwSinglePrice ?? "2.00",
        bwDoublePrice: settings?.bwDoublePrice ?? "1.50",
        isColorEnabled: settings?.isColorEnabled ?? false,
        colorSinglePrice: settings?.colorSinglePrice ?? "10.00",
        colorDoublePrice: settings?.colorDoublePrice ?? "8.00",
        isDuplexEnabled: settings?.isDuplexEnabled ?? true,
        supportedPaperSizes: settings?.supportedPaperSizes ?? ["A4"],
        addons,
      },
    },
  });
});

// ==========================================
// 2. PROTECTED: Shopkeeper Catalog & Settings
// ==========================================

const updateCatalogSchema = z.object({
  isBwEnabled: z.boolean().optional(),
  bwSinglePrice: z.coerce.number().positive().optional(),
  bwDoublePrice: z.coerce.number().positive().optional(),
  isColorEnabled: z.boolean().optional(),
  colorSinglePrice: z.coerce.number().positive().optional(),
  colorDoublePrice: z.coerce.number().positive().optional(),
  isDuplexEnabled: z.boolean().optional(),
  supportedPaperSizes: z.array(z.string()).optional(),
});

// PUT /api/v1/shop/catalog/update (Protected)
shopsRoutes.put("/catalog/update", requireShopAuth, async (c) => {
  const shopId = c.get("shopId");
  const body = await c.req.json();
  const parsed = updateCatalogSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, errors: parsed.error.flatten().fieldErrors }, 400);
  }

  const valuesToUpdate: Record<string, any> = { updatedAt: new Date() };

  if (parsed.data.isBwEnabled !== undefined) valuesToUpdate.isBwEnabled = parsed.data.isBwEnabled;
  if (parsed.data.isColorEnabled !== undefined) valuesToUpdate.isColorEnabled = parsed.data.isColorEnabled;
  if (parsed.data.isDuplexEnabled !== undefined) valuesToUpdate.isDuplexEnabled = parsed.data.isDuplexEnabled;
  if (parsed.data.bwSinglePrice !== undefined) valuesToUpdate.bwSinglePrice = parsed.data.bwSinglePrice.toFixed(2);
  if (parsed.data.bwDoublePrice !== undefined) valuesToUpdate.bwDoublePrice = parsed.data.bwDoublePrice.toFixed(2);
  if (parsed.data.colorSinglePrice !== undefined)
    valuesToUpdate.colorSinglePrice = parsed.data.colorSinglePrice.toFixed(2);
  if (parsed.data.colorDoublePrice !== undefined)
    valuesToUpdate.colorDoublePrice = parsed.data.colorDoublePrice.toFixed(2);
  if (parsed.data.supportedPaperSizes !== undefined)
    valuesToUpdate.supportedPaperSizes = parsed.data.supportedPaperSizes;

  const [updatedSettings] = await db
    .update(shopPrintSettings)
    .set(valuesToUpdate)
    .where(eq(shopPrintSettings.shopId, shopId))
    .returning();

  return c.json({
    success: true,
    message: "Catalog rates and capabilities updated successfully",
    data: updatedSettings,
  });
});

// GET /api/v1/shops/qr/standee (Protected)
// Returns high-res SVG & DataURL for printing standees
shopsRoutes.get("/qr/standee", requireShopAuth, async (c) => {
  const shopSlug = c.get("shopSlug");
  const qr = await generateShopQr(shopSlug);

  return c.json({
    success: true,
    data: qr,
  });
});

// ==========================================
// 3. PROTECTED: Manage Add-ons (Spiral Binding, Lamination)
// ==========================================

const addonSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(["BINDING", "LAMINATION", "STAPLING", "CUSTOM"]).default("CUSTOM"),
  price: z.coerce.number().positive(),
});

// POST /api/v1/shops/addons
shopsRoutes.post("/addons", requireShopAuth, async (c) => {
  const shopId = c.get("shopId");
  const body = await c.req.json();
  const parsed = addonSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, errors: parsed.error.flatten().fieldErrors }, 400);
  }

  const [createdAddon] = await db
    .insert(shopAddons)
    .values({
      shopId,
      name: parsed.data.name,
      type: parsed.data.type,
      price: parsed.data.price.toFixed(2),
      isActive: true,
    })
    .returning();

  return c.json({
    success: true,
    message: "Add-on service added to catalog",
    data: createdAddon,
  });
});

// DELETE /api/v1/shops/addons/:id
shopsRoutes.delete("/addons/:id", requireShopAuth, async (c) => {
  const shopId = c.get("shopId");
  const addonId = c.req.param("id");

  if (!addonId) {
    return c.json({ success: false, message: "Addon ID is required" }, 400);
  }

  await db
    .delete(shopAddons)
    .where(and(eq(shopAddons.id, addonId), eq(shopAddons.shopId, shopId)));

  return c.json({
    success: true,
    message: "Add-on removed from catalog",
  });
});
