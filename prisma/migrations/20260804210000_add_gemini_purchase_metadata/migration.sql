ALTER TABLE "purchases"
ADD COLUMN "ocr_provider" VARCHAR(50),
ADD COLUMN "ocr_schema_version" VARCHAR(50),
ADD COLUMN "ocr_payload" JSONB,
ADD COLUMN "ocr_confidence" DECIMAL(5,4),
ADD COLUMN "ocr_warnings" JSONB,
ADD COLUMN "ocr_requires_review" BOOLEAN;

ALTER TABLE "purchases"
ADD CONSTRAINT "purchases_ocr_confidence_check"
CHECK ("ocr_confidence" IS NULL OR ("ocr_confidence" >= 0 AND "ocr_confidence" <= 1));
