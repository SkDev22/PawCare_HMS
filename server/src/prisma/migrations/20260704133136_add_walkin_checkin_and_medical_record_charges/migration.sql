/*
  Warnings:

  - You are about to drop the column `inventory_item_id` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the `medical_record_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `medical_record_services` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "medical_record_items" DROP CONSTRAINT "medical_record_items_item_id_fkey";

-- DropForeignKey
ALTER TABLE "medical_record_items" DROP CONSTRAINT "medical_record_items_medical_record_id_fkey";

-- DropForeignKey
ALTER TABLE "medical_record_services" DROP CONSTRAINT "medical_record_services_medical_record_id_fkey";

-- DropForeignKey
ALTER TABLE "medical_record_services" DROP CONSTRAINT "medical_record_services_service_id_fkey";

-- DropForeignKey
ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_inventory_item_id_fkey";

-- AlterTable
ALTER TABLE "prescriptions" DROP COLUMN "inventory_item_id";

-- DropTable
DROP TABLE "medical_record_items";

-- DropTable
DROP TABLE "medical_record_services";

-- CreateTable
CREATE TABLE "medical_record_charges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medical_record_id" UUID NOT NULL,
    "item_id" UUID,
    "service_id" UUID,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "invoice_line_item_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_record_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_record_charges_invoice_line_item_id_key" ON "medical_record_charges"("invoice_line_item_id");

-- CreateIndex
CREATE INDEX "medical_record_charges_medical_record_id_idx" ON "medical_record_charges"("medical_record_id");

-- AddForeignKey
ALTER TABLE "medical_record_charges" ADD CONSTRAINT "medical_record_charges_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_charges" ADD CONSTRAINT "medical_record_charges_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_charges" ADD CONSTRAINT "medical_record_charges_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_charges" ADD CONSTRAINT "medical_record_charges_invoice_line_item_id_fkey" FOREIGN KEY ("invoice_line_item_id") REFERENCES "invoice_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_charges" ADD CONSTRAINT "medical_record_charges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
