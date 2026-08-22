-- CreateEnum
CREATE TYPE "KennelStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'CLEANING', 'OUT_OF_SERVICE');

-- AlterTable: add the new status column (nullable for the backfill step)
ALTER TABLE "kennel_units" ADD COLUMN "status" "KennelStatus";

-- Backfill status from the existing is_occupied flag
UPDATE "kennel_units"
SET "status" = CASE WHEN "is_occupied" = true THEN 'OCCUPIED'::"KennelStatus" ELSE 'AVAILABLE'::"KennelStatus" END;

-- Enforce NOT NULL + default now that every row has a value
ALTER TABLE "kennel_units" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "kennel_units" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';

-- Drop the old boolean column
ALTER TABLE "kennel_units" DROP COLUMN "is_occupied";
