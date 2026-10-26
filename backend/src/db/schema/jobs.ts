import { pgTable, uuid, varchar, decimal, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { shops } from "./shops";

export const printJobs = pgTable("print_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id")
    .references(() => shops.id, { onDelete: "cascade" })
    .notNull(),

  // The 4-digit counter pickup PIN (e.g. "4821")
  pickupPin: varchar("pickup_pin", { length: 4 }).notNull(),

  customerSessionId: varchar("customer_session_id", { length: 64 }).notNull(),
  customerPhoneMasked: varchar("customer_phone_masked", { length: 30 }),

  // Status transitions: PENDING -> QUEUED -> PRINTING -> COMPLETED / CANCELLED / EXPIRED
  status: varchar("status", { length: 30 }).default("PENDING").notNull(),

  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }).default("UNPAID").notNull(),

  expiresAt: timestamp("expires_at").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const printJobItems = pgTable("print_job_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .references(() => printJobs.id, { onDelete: "cascade" })
    .notNull(),

  fileKey: text("file_key").notNull(),
  originalFilename: text("original_filename").notNull(),
  fileSize: integer("file_size").notNull(),
  pageCount: integer("page_count").notNull(),
  pageRange: text("page_range").default("all").notNull(),

  copies: integer("copies").default(1).notNull(),
  colorMode: varchar("color_mode", { length: 20 }).default("BW").notNull(), // "BW" | "COLOR"
  paperSize: varchar("paper_size", { length: 20 }).default("A4").notNull(),
  isDuplex: boolean("is_duplex").default(false).notNull(),
  itemPrice: decimal("item_price", { precision: 10, scale: 2 }).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PrintJob = typeof printJobs.$inferSelect;
export type NewPrintJob = typeof printJobs.$inferInsert;
export type PrintJobItem = typeof printJobItems.$inferSelect;
export type NewPrintJobItem = typeof printJobItems.$inferInsert;

