-- Add CompetitionType and EntryStatus enums for competition entry system
CREATE TYPE "CompetitionType" AS ENUM ('RAFFLE', 'PHOTO', 'SCORE');
CREATE TYPE "EntryStatus" AS ENUM ('JOINED', 'WITHDRAWN', 'WINNER', 'RUNNER_UP');

-- Add competition type and configuration fields to Competition table
ALTER TABLE "Competition"
ADD COLUMN "type" "CompetitionType" NOT NULL DEFAULT 'RAFFLE',
ADD COLUMN "winnersCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "maxParticipants" INTEGER;

-- Create CompetitionEntry table
CREATE TABLE "CompetitionEntry" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'JOINED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submissionUrl" TEXT,
    "submissionText" TEXT,
    "score" DOUBLE PRECISION,
    "winnerAt" TIMESTAMP(3),
    "prize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionEntry_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "CompetitionEntry"
ADD CONSTRAINT "CompetitionEntry_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "CompetitionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for performance
CREATE INDEX "CompetitionEntry_competitionId_idx" ON "CompetitionEntry"("competitionId");
CREATE INDEX "CompetitionEntry_userId_idx" ON "CompetitionEntry"("userId");
CREATE INDEX "CompetitionEntry_status_idx" ON "CompetitionEntry"("status");
