CREATE TYPE "AiUsageStatus" AS ENUM ('COMPLETED', 'FAILED');

CREATE TABLE "ai_model_pricings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" VARCHAR(100) NOT NULL,
  "model" VARCHAR(150) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'USD',
  "input_cost_per_million_tokens" DECIMAL(18,9) NOT NULL,
  "output_cost_per_million_tokens" DECIMAL(18,9) NOT NULL,
  "effective_from" TIMESTAMPTZ(6) NOT NULL,
  "effective_to" TIMESTAMPTZ(6),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ai_model_pricings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_model_pricings_provider_model_effective_from_key"
ON "ai_model_pricings"("provider", "model", "effective_from");
CREATE INDEX "ai_model_pricings_provider_model_is_active_idx"
ON "ai_model_pricings"("provider", "model", "is_active");

CREATE TABLE "ai_usage_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pricing_id" UUID,
  "provider" VARCHAR(100) NOT NULL,
  "model" VARCHAR(150) NOT NULL,
  "module" VARCHAR(100) NOT NULL,
  "action" VARCHAR(150) NOT NULL,
  "status" "AiUsageStatus" NOT NULL DEFAULT 'COMPLETED',
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "thought_tokens" INTEGER,
  "total_tokens" INTEGER,
  "input_cost" DECIMAL(20,12),
  "output_cost" DECIMAL(20,12),
  "total_cost" DECIMAL(20,12),
  "currency" CHAR(3) NOT NULL DEFAULT 'USD',
  "input_rate_per_million_tokens" DECIMAL(18,9),
  "output_rate_per_million_tokens" DECIMAL(18,9),
  "latency_milliseconds" INTEGER,
  "error_code" VARCHAR(100),
  "correlation_id" VARCHAR(255),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_usage_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_usage_records_module_action_created_at_idx"
ON "ai_usage_records"("module", "action", "created_at");
CREATE INDEX "ai_usage_records_provider_model_created_at_idx"
ON "ai_usage_records"("provider", "model", "created_at");
CREATE INDEX "ai_usage_records_status_created_at_idx"
ON "ai_usage_records"("status", "created_at");

ALTER TABLE "ai_usage_records"
ADD CONSTRAINT "ai_usage_records_pricing_id_fkey"
FOREIGN KEY ("pricing_id") REFERENCES "ai_model_pricings"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ai_model_pricings" (
  "provider",
  "model",
  "currency",
  "input_cost_per_million_tokens",
  "output_cost_per_million_tokens",
  "effective_from",
  "is_active",
  "updated_at"
)
VALUES (
  'GEMINI',
  'gemini-3.5-flash-lite',
  'USD',
  0.30,
  2.50,
  TIMESTAMPTZ '2026-08-05 00:00:00+00',
  true,
  CURRENT_TIMESTAMP
);
