-- Technical baseline for validating Prisma migrations in the initial API setup.
CREATE TABLE "_technical_seed" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "_technical_seed_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "_technical_seed_key_key" ON "_technical_seed"("key");
