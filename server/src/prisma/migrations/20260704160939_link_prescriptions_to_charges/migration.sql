-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "charge_id" UUID,
ADD COLUMN     "item_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_charge_id_key" ON "prescriptions"("charge_id");

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "medical_record_charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

