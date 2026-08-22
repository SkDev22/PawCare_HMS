/*
  Warnings:

  - You are about to drop the column `assessment` on the `soap_notes` table. All the data in the column will be lost.
  - You are about to drop the column `objective` on the `soap_notes` table. All the data in the column will be lost.
  - You are about to drop the column `plan` on the `soap_notes` table. All the data in the column will be lost.
  - You are about to drop the column `subjective` on the `soap_notes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "soap_notes" DROP COLUMN "assessment",
DROP COLUMN "objective",
DROP COLUMN "plan",
DROP COLUMN "subjective",
ADD COLUMN     "note" TEXT;
