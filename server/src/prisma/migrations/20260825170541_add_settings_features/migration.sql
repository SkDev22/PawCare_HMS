/*
  Warnings:

  - A unique constraint covering the columns `[clinic_id,invoice_number]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "invoice_due_days" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "invoice_footer_text" TEXT,
ADD COLUMN     "invoice_next_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "invoice_prefix" TEXT NOT NULL DEFAULT 'INV-',
ADD COLUMN     "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "invoice_number" TEXT,
ADD COLUMN     "tax_auto" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "clinic_hours" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "open_time" TEXT,
    "close_time" TEXT,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinic_hours_clinic_id_day_of_week_key" ON "clinic_hours"("clinic_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_clinic_id_invoice_number_key" ON "invoices"("clinic_id", "invoice_number");

-- AddForeignKey
ALTER TABLE "clinic_hours" ADD CONSTRAINT "clinic_hours_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
