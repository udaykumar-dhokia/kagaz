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

  // Shop Profile Details
  logoUrl: text("logo_url"),
  upiId: varchar("upi_id", { length: 120 }),
  address: text("address"),

  // 10-Day Free Trial & Subscription (Dodo Payments)
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionStatus: varchar("subscription_status", { length: 32 }).default("TRIAL").notNull(), // 'TRIAL' | 'ACTIVE' | 'EXPIRED'
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  dodoSubscriptionId: varchar("dodo_subscription_id", { length: 128 }),
  dodoCustomerId: varchar("dodo_customer_id", { length: 128 }),
  currentPlan: varchar("current_plan", { length: 64 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Shop = typeof shops.$inferSelect;
export type NewShop = typeof shops.$inferInsert;

