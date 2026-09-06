-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "locationAccuracy" DOUBLE PRECISION,
ADD COLUMN     "locationAdjusted" BOOLEAN NOT NULL DEFAULT false;
