-- CreateEnum
CREATE TYPE "InvoiceChannel" AS ENUM ('CLINICAL', 'RETAIL');

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_owner_id_fkey";

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "channel" "InvoiceChannel" NOT NULL DEFAULT 'CLINICAL',
ALTER COLUMN "owner_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
