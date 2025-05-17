CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"parent_id" integer,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "product_search_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"user_id" varchar(50),
	"timestamp" timestamp DEFAULT now(),
	"results" jsonb
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" real,
	"category" varchar(100),
	"sku" varchar(50),
	"in_stock" real DEFAULT 0,
	"attributes" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
