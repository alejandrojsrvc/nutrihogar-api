CREATE TYPE "AiProposalType" AS ENUM ('WEEKLY_PLAN', 'RECIPE', 'FOOD_SUBSTITUTION', 'PORTION', 'MEAL_ADJUSTMENT');
CREATE TYPE "AiGenerationRequestStatus" AS ENUM ('REQUESTED', 'GENERATED', 'FAILED');
CREATE TYPE "AiProposalStatus" AS ENUM ('GENERATED', 'VALIDATED', 'REQUIRES_CHANGES', 'READY_FOR_REVIEW', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'EXPIRED', 'FAILED');
CREATE TYPE "AiDecisionType" AS ENUM ('ACCEPT', 'ACCEPT_WITH_CHANGES', 'REJECT', 'REGENERATE', 'POSTPONE');

CREATE TABLE "ai_generation_requests" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "proposal_type" "AiProposalType" NOT NULL,
    "context_version" VARCHAR(100) NOT NULL,
    "prompt_version" VARCHAR(100) NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "AiGenerationRequestStatus" NOT NULL,
    "failure_code" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_generation_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_generation_request_adults" (
    "request_id" UUID NOT NULL,
    "adult_profile_id" UUID NOT NULL,
    CONSTRAINT "ai_generation_request_adults_pkey" PRIMARY KEY ("request_id", "adult_profile_id")
);

CREATE TABLE "ai_generated_proposals" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "model" VARCHAR(150) NOT NULL,
    "structured_payload" JSONB NOT NULL,
    "raw_response_reference" VARCHAR(500),
    "status" "AiProposalStatus" NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "input_token_count" INTEGER,
    "output_token_count" INTEGER,
    "estimated_cost" DECIMAL(18,6),
    "latency_milliseconds" INTEGER,
    "correlation_id" VARCHAR(255),
    CONSTRAINT "ai_generated_proposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_proposal_validations" (
    "id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "schema_valid" BOOLEAN NOT NULL,
    "catalog_valid" BOOLEAN NOT NULL,
    "nutrition_valid" BOOLEAN NOT NULL,
    "restrictions_valid" BOOLEAN NOT NULL,
    "inventory_valid" BOOLEAN NOT NULL,
    "budget_evaluated" BOOLEAN NOT NULL,
    "warnings" JSONB NOT NULL,
    "errors" JSONB NOT NULL,
    "validated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ai_proposal_validations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_proposal_decisions" (
    "id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "decision" "AiDecisionType" NOT NULL,
    "selected_items" JSONB NOT NULL,
    "edited_payload" JSONB,
    "decided_by_id" UUID NOT NULL,
    "decided_at" TIMESTAMPTZ(6) NOT NULL,
    "reason" TEXT,
    CONSTRAINT "ai_proposal_decisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_proposal_validations_proposal_id_key" ON "ai_proposal_validations"("proposal_id");
CREATE UNIQUE INDEX "ai_proposal_decisions_proposal_id_key" ON "ai_proposal_decisions"("proposal_id");
CREATE INDEX "ai_generation_requests_household_id_proposal_type_status_requested_at_idx" ON "ai_generation_requests"("household_id", "proposal_type", "status", "requested_at");
CREATE INDEX "ai_generation_requests_requested_by_id_requested_at_idx" ON "ai_generation_requests"("requested_by_id", "requested_at");
CREATE INDEX "ai_generation_request_adults_adult_profile_id_idx" ON "ai_generation_request_adults"("adult_profile_id");
CREATE INDEX "ai_generated_proposals_request_id_idx" ON "ai_generated_proposals"("request_id");
CREATE INDEX "ai_generated_proposals_status_expires_at_idx" ON "ai_generated_proposals"("status", "expires_at");
CREATE INDEX "ai_proposal_validations_validated_at_idx" ON "ai_proposal_validations"("validated_at");
CREATE INDEX "ai_proposal_decisions_decided_by_id_decided_at_idx" ON "ai_proposal_decisions"("decided_by_id", "decided_at");

ALTER TABLE "ai_generation_requests" ADD CONSTRAINT "ai_generation_requests_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_generation_requests" ADD CONSTRAINT "ai_generation_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_generation_request_adults" ADD CONSTRAINT "ai_generation_request_adults_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "ai_generation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_generation_request_adults" ADD CONSTRAINT "ai_generation_request_adults_adult_profile_id_fkey" FOREIGN KEY ("adult_profile_id") REFERENCES "adult_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_generated_proposals" ADD CONSTRAINT "ai_generated_proposals_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "ai_generation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_proposal_validations" ADD CONSTRAINT "ai_proposal_validations_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "ai_generated_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_proposal_decisions" ADD CONSTRAINT "ai_proposal_decisions_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "ai_generated_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_proposal_decisions" ADD CONSTRAINT "ai_proposal_decisions_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
