import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { shops, shopPrintSettings } from "../../db/schema";
import { registerShopSchema, loginShopSchema } from "./auth.schema";
import { generateShopSlug, generateQrToken } from "../../utils/slug";
import { generateShopQr } from "../../services/qr.service";
import { createShopToken, requireShopAuth, type AppEnv } from "../../middlewares/auth.middleware";

export const authRoutes = new Hono<AppEnv>();

// POST /api/v1/auth/register
authRoutes.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = registerShopSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        {
          success: false,
          errors: parsed.error.flatten().fieldErrors,
        },
        400
      );
    }

    const {
      name,
      email,
      phone,
      password,
      isColorEnabled,
      bwSinglePrice,
      bwDoublePrice,
      colorSinglePrice,
      colorDoublePrice,
    } = parsed.data;

    // Check if email already exists
    const [existingShop] = await db.select().from(shops).where(eq(shops.ownerEmail, email.toLowerCase()));
    if (existingShop) {
      return c.json({ success: false, message: "A shop with this email already exists" }, 409);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate unique slug & QR code token
    const slug = generateShopSlug(name);
    const qrToken = generateQrToken();

    // Generate unique shop QR code asset
    const qrResult = await generateShopQr(slug);

    // Create shop in database
    const [createdShop] = await db
      .insert(shops)
      .values({
        name,
        slug,
        ownerEmail: email.toLowerCase(),
        ownerPhone: phone || null,
        passwordHash,
        qrCodeToken: qrToken,
        qrCodeDataUrl: qrResult.dataUrl,
      })
      .returning();

    if (!createdShop) {
      return c.json({ success: false, message: "Failed to create shop account" }, 500);
    }

    // Create default catalog & print capabilities for the shop
    const [createdSettings] = await db
      .insert(shopPrintSettings)
      .values({
        shopId: createdShop.id,
        isBwEnabled: true,
        bwSinglePrice: bwSinglePrice.toFixed(2),
        bwDoublePrice: bwDoublePrice.toFixed(2),
        isColorEnabled,
        colorSinglePrice: colorSinglePrice.toFixed(2),
        colorDoublePrice: colorDoublePrice.toFixed(2),
        isDuplexEnabled: true,
        supportedPaperSizes: ["A4", "LEGAL"],
      })
      .returning();

    // Generate JWT token
    const token = await createShopToken({
      shopId: createdShop.id,
      email: createdShop.ownerEmail,
      slug: createdShop.slug,
    });

    return c.json(
      {
        success: true,
        message: "Shop registered successfully with custom QR code",
        data: {
          token,
          shop: {
            id: createdShop.id,
            name: createdShop.name,
            slug: createdShop.slug,
            email: createdShop.ownerEmail,
            phone: createdShop.ownerPhone,
            qrCodeUrl: qrResult.url,
            qrCodeDataUrl: qrResult.dataUrl,
          },
          settings: createdSettings,
        },
      },
      201
    );
  } catch (error: any) {
    console.error("Shop registration error:", error);
    return c.json({ success: false, message: error?.message || "Internal server error" }, 500);
  }
});

// POST /api/v1/auth/login
authRoutes.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = loginShopSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, errors: parsed.error.flatten().fieldErrors }, 400);
    }

    const { email, password } = parsed.data;

    const [shop] = await db.select().from(shops).where(eq(shops.ownerEmail, email.toLowerCase()));
    if (!shop) {
      return c.json({ success: false, message: "Invalid email or password" }, 401);
    }

    const isMatch = await bcrypt.compare(password, shop.passwordHash);
    if (!isMatch) {
      return c.json({ success: false, message: "Invalid email or password" }, 401);
    }

    // Fetch settings
    const [settings] = await db.select().from(shopPrintSettings).where(eq(shopPrintSettings.shopId, shop.id));

    // Generate JWT
    const token = await createShopToken({
      shopId: shop.id,
      email: shop.ownerEmail,
      slug: shop.slug,
    });

    return c.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        shop: {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          email: shop.ownerEmail,
          phone: shop.ownerPhone,
          qrCodeDataUrl: shop.qrCodeDataUrl,
        },
        settings,
      },
    });
  } catch (error: any) {
    console.error("Shop login error:", error);
    return c.json({ success: false, message: error?.message || "Internal server error" }, 500);
  }
});

// GET /api/v1/auth/me (Protected)
authRoutes.get("/me", requireShopAuth, async (c) => {
  const shopId = c.get("shopId");
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));

  if (!shop) {
    return c.json({ success: false, message: "Shop not found" }, 404);
  }

  const [settings] = await db.select().from(shopPrintSettings).where(eq(shopPrintSettings.shopId, shopId));

  return c.json({
    success: true,
    data: {
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        email: shop.ownerEmail,
        phone: shop.ownerPhone,
        qrCodeDataUrl: shop.qrCodeDataUrl,
      },
      settings,
    },
  });
});

