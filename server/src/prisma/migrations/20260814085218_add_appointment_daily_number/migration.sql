-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "daily_number" INTEGER;

-- CreateTable
CREATE TABLE "daily_counters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_counters_clinic_id_date_key" ON "daily_counters"("clinic_id", "date");
