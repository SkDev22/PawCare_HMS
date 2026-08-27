-- CreateEnum
CREATE TYPE "ControlledDispenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "controlled_substance_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "requested_by" UUID NOT NULL,
    "status" "ControlledDispenseStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" UUID,
    "decided_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "controlled_substance_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "controlled_substance_approvals_prescription_id_key" ON "controlled_substance_approvals"("prescription_id");

-- CreateIndex
CREATE INDEX "controlled_substance_approvals_clinic_id_status_idx" ON "controlled_substance_approvals"("clinic_id", "status");

-- AddForeignKey
ALTER TABLE "controlled_substance_approvals" ADD CONSTRAINT "controlled_substance_approvals_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controlled_substance_approvals" ADD CONSTRAINT "controlled_substance_approvals_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
