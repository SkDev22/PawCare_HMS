-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "medical_record_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "audit_logs_clinic_id_created_at_idx" ON "audit_logs"("clinic_id", "created_at");
