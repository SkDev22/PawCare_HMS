-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "received_by" UUID;

-- CreateTable
CREATE TABLE "pos_returns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "reason" TEXT,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "refund_method" TEXT NOT NULL,
    "processed_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_return_line_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "return_id" UUID NOT NULL,
    "line_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "pos_return_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pos_returns_invoice_id_idx" ON "pos_returns"("invoice_id");

-- AddForeignKey
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_return_line_items" ADD CONSTRAINT "pos_return_line_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "pos_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_return_line_items" ADD CONSTRAINT "pos_return_line_items_line_item_id_fkey" FOREIGN KEY ("line_item_id") REFERENCES "invoice_line_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
