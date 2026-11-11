-- Additive and safe to run after the existing Revelo schema has been created.
-- IF NOT EXISTS also supports databases previously updated with `prisma db push`.
CREATE TABLE IF NOT EXISTS "TripMessage" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripMessage_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "TripMessage"
      ADD CONSTRAINT "TripMessage_tripId_fkey"
      FOREIGN KEY ("tripId") REFERENCES "Trip"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "TripMessage"
      ADD CONSTRAINT "TripMessage_senderId_fkey"
      FOREIGN KEY ("senderId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "TripMessage_tripId_createdAt_idx"
  ON "TripMessage"("tripId", "createdAt");
CREATE INDEX IF NOT EXISTS "TripMessage_senderId_readAt_idx"
  ON "TripMessage"("senderId", "readAt");
