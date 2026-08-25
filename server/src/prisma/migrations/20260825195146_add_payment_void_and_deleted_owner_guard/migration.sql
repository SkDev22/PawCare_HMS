-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "voided_at" TIMESTAMP(3),
ADD COLUMN     "voided_by" UUID,
ADD COLUMN     "voided_reason" TEXT;
