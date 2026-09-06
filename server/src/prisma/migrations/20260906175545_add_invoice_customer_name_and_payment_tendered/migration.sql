-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "customer_name" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "amount_tendered" DECIMAL(10,2);
