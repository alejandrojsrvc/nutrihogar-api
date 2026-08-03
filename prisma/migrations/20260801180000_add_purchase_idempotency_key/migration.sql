ALTER TABLE "purchases" ADD COLUMN "idempotency_key" VARCHAR(255);
CREATE UNIQUE INDEX "purchases_idempotency_key_key" ON "purchases"("idempotency_key");
