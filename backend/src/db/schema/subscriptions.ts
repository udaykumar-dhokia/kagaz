import { pgTable, uuid, varchar, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { shops } from "./shops";

export const subscriptionTransactions = pgTable("subscription_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").references(() => shops.id, { onDelete: "cascade" }).notNull(),
  dodoPaymentId: varchar("dodo_payment_id", { length: 128 }),
  dodoSubscriptionId: varchar("dodo_subscription_id", { length: 128 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("INR").notNull(),
  status: varchar("status", { length: 32 }).notNull(), // 'SUCCESS' | 'FAILED' | 'PENDING'
  planType: varchar("plan_type", { length: 64 }).notNull(),
  rawEvent: text("raw_event"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SubscriptionTransaction = typeof subscriptionTransactions.$inferSelect;
export type NewSubscriptionTransaction = typeof subscriptionTransactions.$inferInsert;
