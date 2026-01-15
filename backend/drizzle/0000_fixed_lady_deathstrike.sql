CREATE TABLE IF NOT EXISTS "email_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender" varchar(255) NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"summary" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"keywords" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
