-- Add LINEAR_SCALE to QuestionType enum
ALTER TYPE "QuestionType" ADD VALUE 'LINEAR_SCALE';

-- Add config JSON column to Question (with default empty object)
ALTER TABLE "Question" ADD COLUMN "config" JSONB DEFAULT '{}' NOT NULL;

-- Add sectionId FK column to Question
ALTER TABLE "Question" ADD COLUMN "sectionId" TEXT;

-- Add config JSON column to Survey (with default empty object)
ALTER TABLE "Survey" ADD COLUMN "config" JSONB DEFAULT '{}' NOT NULL;

-- Create SurveySection table
CREATE TABLE "SurveySection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "image" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveySection_pkey" PRIMARY KEY ("id")
);

-- Create indexes for SurveySection
CREATE INDEX "SurveySection_surveyId_idx" ON "SurveySection"("surveyId");

-- Create index for Question.sectionId
CREATE INDEX "Question_sectionId_idx" ON "Question"("sectionId");

-- Add foreign key constraints
ALTER TABLE "Question" ADD CONSTRAINT "Question_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SurveySection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SurveySection" ADD CONSTRAINT "SurveySection_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
