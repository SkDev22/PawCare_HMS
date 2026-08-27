/*
  Warnings:

  - A unique constraint covering the columns `[owner_id,type,reference_id]` on the table `notifications` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "notifications_owner_id_type_reference_id_key" ON "notifications"("owner_id", "type", "reference_id");
