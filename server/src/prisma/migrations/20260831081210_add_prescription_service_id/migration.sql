-- AlterTable
ALTER TABLE "controlled_substance_approvals" ADD COLUMN     "batch_id" UUID;

-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "service_id" UUID;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
