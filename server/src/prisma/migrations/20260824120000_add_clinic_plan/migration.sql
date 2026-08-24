-- CreateEnum
CREATE TYPE "ClinicPlan" AS ENUM ('TRIAL', 'BASIC', 'PRO', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "clinics" ADD COLUMN "plan" "ClinicPlan" NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "clinics" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
