import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const shops = pgTable("shops", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  ownerEmail: varchar("owner_email", { length: 255 }).notNull().unique(),
  ownerPhone: varchar("owner_phone", { length: 20 }),
  passwordHash: text("password_hash").notNull(),
  qrCodeToken: varchar("qr_code_token", { length: 64 }).notNull().unique(),
  qrCodeDataUrl: text("qr_code_data_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Shop = typeof shops.$inferSelect;
export type NewShop = typeof shops.$inferInsert;

