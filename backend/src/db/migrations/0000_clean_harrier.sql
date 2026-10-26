CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"owner_email" varchar(255) NOT NULL,
	"owner_phone" varchar(20),
	"password_hash" text NOT NULL,
	"qr_code_token" varchar(64) NOT NULL,
	"qr_code_data_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shops_slug_unique" UNIQUE("slug"),
	CONSTRAINT "shops_owner_email_unique" UNIQUE("owner_email"),
	CONSTRAINT "shops_qr_code_token_unique" UNIQUE("qr_code_token")
);
--> statement-breakpoint
CREATE TABLE "shop_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_print_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"is_bw_enabled" boolean DEFAULT true NOT NULL,
	"bw_single_price" numeric(10, 2) DEFAULT '2.00' NOT NULL,
	"bw_double_price" numeric(10, 2) DEFAULT '1.50' NOT NULL,
	"is_color_enabled" boolean DEFAULT false NOT NULL,
	"color_single_price" numeric(10, 2) DEFAULT '10.00' NOT NULL,
	"color_double_price" numeric(10, 2) DEFAULT '8.00' NOT NULL,
	"is_duplex_enabled" boolean DEFAULT true NOT NULL,
	"supported_paper_sizes" text[] DEFAULT '{"A4"}' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shop_print_settings_shop_id_unique" UNIQUE("shop_id")
);
--> statement-breakpoint
CREATE TABLE "print_job_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"file_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"file_size" integer NOT NULL,
	"page_count" integer NOT NULL,
	"page_range" text DEFAULT 'all' NOT NULL,
	"copies" integer DEFAULT 1 NOT NULL,
	"color_mode" varchar(20) DEFAULT 'BW' NOT NULL,
	"paper_size" varchar(20) DEFAULT 'A4' NOT NULL,
	"is_duplex" boolean DEFAULT false NOT NULL,
	"item_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"pickup_pin" varchar(4) NOT NULL,
	"customer_session_id" varchar(64) NOT NULL,
	"customer_phone_masked" varchar(30),
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_status" varchar(20) DEFAULT 'UNPAID' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shop_addons" ADD CONSTRAINT "shop_addons_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_print_settings" ADD CONSTRAINT "shop_print_settings_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_job_items" ADD CONSTRAINT "print_job_items_job_id_print_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."print_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;