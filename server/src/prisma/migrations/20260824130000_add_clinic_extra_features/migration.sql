-- AlterTable
ALTER TABLE "clinics" ADD COLUMN "extra_features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
