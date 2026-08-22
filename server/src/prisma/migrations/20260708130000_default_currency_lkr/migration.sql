-- Switch the clinic default currency from USD to LKR
ALTER TABLE "clinics" ALTER COLUMN "currency" SET DEFAULT 'LKR';

-- Existing clinics still set to the old default should move to LKR too
UPDATE "clinics" SET "currency" = 'LKR' WHERE "currency" = 'USD';
