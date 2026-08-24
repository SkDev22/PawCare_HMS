-- CreateTable
CREATE TABLE "stock_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "grn_item_id" UUID,
    "batch_no" TEXT,
    "quantity_received" INTEGER NOT NULL,
    "quantity_remaining" INTEGER NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "selling_price" DECIMAL(10,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "expiry_date" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_received_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "grn_number" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "supplier_invoice_no" TEXT,
    "notes" TEXT,
    "received_by" UUID NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_received_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_received_note_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "grn_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "batch_no" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "selling_price" DECIMAL(10,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "expiry_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_received_note_items_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "inventory_transactions" ADD COLUMN "batch_id" UUID;

-- AlterTable
ALTER TABLE "invoice_line_items" ADD COLUMN "batch_id" UUID;

-- AlterTable
ALTER TABLE "medical_record_charges" ADD COLUMN "batch_id" UUID;

-- Backfill: one legacy batch per existing inventory item, carrying over its
-- current cost/price/expiry/quantity so historical stock value isn't lost
-- once the flat columns on inventory_items are dropped below.
INSERT INTO "stock_batches" (
  "id", "item_id", "batch_no", "quantity_received", "quantity_remaining",
  "unit_cost", "selling_price", "discount_percent", "expiry_date",
  "received_at", "is_closed", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  "id",
  'LEGACY',
  "quantity_on_hand",
  "quantity_on_hand",
  "unit_cost",
  COALESCE("selling_price", "unit_cost"),
  0,
  "expiry_date",
  "created_at",
  "quantity_on_hand" <= 0,
  "created_at",
  "updated_at"
FROM "inventory_items";

-- AlterTable
ALTER TABLE "inventory_items" DROP COLUMN "unit_cost";
ALTER TABLE "inventory_items" DROP COLUMN "selling_price";
ALTER TABLE "inventory_items" DROP COLUMN "expiry_date";

-- CreateIndex
CREATE UNIQUE INDEX "stock_batches_grn_item_id_key" ON "stock_batches"("grn_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_received_notes_clinic_id_grn_number_key" ON "goods_received_notes"("clinic_id", "grn_number");

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_grn_item_id_fkey" FOREIGN KEY ("grn_item_id") REFERENCES "goods_received_note_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_note_items" ADD CONSTRAINT "goods_received_note_items_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "goods_received_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_note_items" ADD CONSTRAINT "goods_received_note_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_charges" ADD CONSTRAINT "medical_record_charges_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
