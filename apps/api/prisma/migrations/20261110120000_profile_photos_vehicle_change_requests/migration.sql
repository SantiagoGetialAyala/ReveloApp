ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "photoData" TEXT;

DO $$ BEGIN
  CREATE TYPE "VehicleChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "VehicleChangeRequest" (
  "id" UUID NOT NULL,
  "vehicleId" UUID NOT NULL,
  "requesterId" UUID NOT NULL,
  "reviewerId" UUID,
  "status" "VehicleChangeStatus" NOT NULL DEFAULT 'PENDING',
  "changes" JSONB NOT NULL,
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "VehicleChangeRequest_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "VehicleChangeRequest" ADD CONSTRAINT "VehicleChangeRequest_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "VehicleChangeRequest" ADD CONSTRAINT "VehicleChangeRequest_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "VehicleChangeRequest" ADD CONSTRAINT "VehicleChangeRequest_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "VehicleChangeRequest_status_createdAt_idx" ON "VehicleChangeRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "VehicleChangeRequest_vehicleId_status_idx" ON "VehicleChangeRequest"("vehicleId", "status");
