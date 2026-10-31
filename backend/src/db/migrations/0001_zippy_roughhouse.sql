CREATE TABLE "subscription_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"dodo_payment_id" varchar(128),
	"dodo_subscription_id" varchar(128),
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"status" varchar(32) NOT NULL,
	"plan_type" varchar(64) NOT NULL,
	"raw_event" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "subscription_status" varchar(32) DEFAULT 'TRIAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "subscription_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "dodo_subscription_id" varchar(128);--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "dodo_customer_id" varchar(128);--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "current_plan" varchar(64);--> statement-breakpoint
ALTER TABLE "subscription_transactions" ADD CONSTRAINT "subscription_transactions_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;