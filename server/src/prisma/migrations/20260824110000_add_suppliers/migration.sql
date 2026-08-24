-- CreateTable
CREATE TABLE "suppliers" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id"  UUID NOT NULL,
    "name"       TEXT NOT NULL,
    "phone"      TEXT,
    "email"      TEXT,
    "address"    TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "goods_received_notes" ADD COLUMN "supplier_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_clinic_id_name_key" ON "suppliers"("clinic_id", "name");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
