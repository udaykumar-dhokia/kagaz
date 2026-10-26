import { pgTable, uuid, varchar, decimal, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { shops } from "./shops";

export const shopPrintSettings = pgTable("shop_print_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id")
    .references(() => shops.id, { onDelete: "cascade" })
    .notNull()
    .unique(),

  // Black & White
  isBwEnabled: boolean("is_bw_enabled").default(true).notNull(),
  bwSinglePrice: decimal("bw_single_price", { precision: 10, scale: 2 }).default("2.00").notNull(),
  bwDoublePrice: decimal("bw_double_price", { precision: 10, scale: 2 }).default("1.50").notNull(),

  // Color
  isColorEnabled: boolean("is_color_enabled").default(false).notNull(),
  colorSinglePrice: decimal("color_single_price", { precision: 10, scale: 2 }).default("10.00").notNull(),
  colorDoublePrice: decimal("color_double_price", { precision: 10, scale: 2 }).default("8.00").notNull(),

  // Duplex (both sides)
  isDuplexEnabled: boolean("is_duplex_enabled").default(true).notNull(),

  // Paper Sizes Supported: e.g. ["A4", "LEGAL", "A3"]
  supportedPaperSizes: text("supported_paper_sizes").array().default(["A4"]).notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shopAddons = pgTable("shop_addons", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id")
    .references(() => shops.id, { onDelete: "cascade" })
    .notNull(),

  name: varchar("name", { length: 100 }).notNull(), // e.g. "Spiral Binding", "A4 Lamination"
  type: varchar("type", { length: 50 }).notNull(), // "BINDING" | "LAMINATION" | "STAPLING" | "CUSTOM"
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ShopPrintSettings = typeof shopPrintSettings.$inferSelect;
export type NewShopPrintSettings = typeof shopPrintSettings.$inferInsert;
export type ShopAddon = typeof shopAddons.$inferSelect;
export type NewShopAddon = typeof shopAddons.$inferInsert;
