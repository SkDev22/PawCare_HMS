/*
  Warnings:

  - A unique constraint covering the columns `[staff_id,type,reference_id]` on the table `notifications` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "reference_id" VARCHAR(150);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_staff_id_type_reference_id_key" ON "notifications"("staff_id", "type", "reference_id");
