/*
  Warnings:

  - A unique constraint covering the columns `[charge_id]` on the table `vaccinations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "vaccinations" ADD COLUMN     "charge_id" UUID,
ADD COLUMN     "item_id" UUID,
ADD COLUMN     "service_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "vaccinations_charge_id_key" ON "vaccinations"("charge_id");

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "medical_record_charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
