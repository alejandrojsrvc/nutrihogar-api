-- CreateEnum
CREATE TYPE "PurchaseSource" AS ENUM ('MANUAL', 'SHOPPING_LIST', 'OCR');

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN "source" "PurchaseSource" NOT NULL DEFAULT 'MANUAL';
