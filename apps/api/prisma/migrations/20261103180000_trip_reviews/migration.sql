-- Reviews are only written for completed trips by the application service.
-- Base Trip and User tables must already exist.
CREATE TABLE IF NOT EXISTS "TripReview" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripReview_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "TripReview" ADD CONSTRAINT "TripReview_tripId_fkey"
      FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "TripReview" ADD CONSTRAINT "TripReview_score_check"
      CHECK ("score" BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "TripReview" ADD CONSTRAINT "TripReview_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "TripReview" ADD CONSTRAINT "TripReview_recipientId_fkey"
      FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "TripReview_tripId_authorId_key"
  ON "TripReview"("tripId", "authorId");
CREATE INDEX IF NOT EXISTS "TripReview_recipientId_createdAt_idx"
  ON "TripReview"("recipientId", "createdAt");
