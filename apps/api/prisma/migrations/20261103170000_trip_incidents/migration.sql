-- Additive incident log. Base User and Trip tables must already exist.
DO $$ BEGIN
    CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'WAITING_INFO', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TripIncident" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TripIncident_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "TripIncident" ADD CONSTRAINT "TripIncident_tripId_fkey"
      FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "TripIncident" ADD CONSTRAINT "TripIncident_reporterId_fkey"
      FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "IncidentHistory" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "status" "IncidentStatus" NOT NULL,
    "note" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncidentHistory_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "IncidentHistory" ADD CONSTRAINT "IncidentHistory_incidentId_fkey"
      FOREIGN KEY ("incidentId") REFERENCES "TripIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "IncidentHistory" ADD CONSTRAINT "IncidentHistory_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "TripIncident_tripId_createdAt_idx" ON "TripIncident"("tripId", "createdAt");
CREATE INDEX IF NOT EXISTS "TripIncident_status_createdAt_idx" ON "TripIncident"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "IncidentHistory_incidentId_createdAt_idx" ON "IncidentHistory"("incidentId", "createdAt");
