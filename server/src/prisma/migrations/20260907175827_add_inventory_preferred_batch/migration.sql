/*
  Warnings:

  - A unique constraint covering the columns `[preferred_batch_id]` on the table `inventory_items` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "preferred_batch_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_preferred_batch_id_key" ON "inventory_items"("preferred_batch_id");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_preferred_batch_id_fkey" FOREIGN KEY ("preferred_batch_id") REFERENCES "stock_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
