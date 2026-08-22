-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "checked_in_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "inventory_item_id" UUID;

-- CreateTable
CREATE TABLE "medical_record_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medical_record_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_record_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_record_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medical_record_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_record_services_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_items" ADD CONSTRAINT "medical_record_items_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_items" ADD CONSTRAINT "medical_record_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_services" ADD CONSTRAINT "medical_record_services_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_services" ADD CONSTRAINT "medical_record_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
