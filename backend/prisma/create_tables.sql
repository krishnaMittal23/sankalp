-- Create Prisma migration tracking table
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id                      VARCHAR(36) PRIMARY KEY,
    checksum                VARCHAR(64) NOT NULL,
    finished_at             TIMESTAMPTZ,
    migration_name          VARCHAR(255) NOT NULL,
    logs                    TEXT,
    rolled_back_at          TIMESTAMPTZ,
    started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count     INTEGER NOT NULL DEFAULT 0
);

-- Interview table
CREATE TABLE IF NOT EXISTS "Interview" (
    "id" TEXT NOT NULL,
    "userName" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "skills" TEXT[],
    "analysisSessionActive" BOOLEAN NOT NULL DEFAULT false,
    "bodyLanguageScore" DOUBLE PRECISION,
    "voiceToneScore" DOUBLE PRECISION,
    "combinedScore" DOUBLE PRECISION,
    "overallStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- Question table
CREATE TABLE IF NOT EXISTS "Question" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "audioGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- Transcript table
CREATE TABLE IF NOT EXISTS "Transcript" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "evaluation" TEXT,
    "responseScore" DOUBLE PRECISION,
    "voiceToneScore" DOUBLE PRECISION,
    "bodyLanguageScore" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "voiceAnalysis" JSONB,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- Report table
CREATE TABLE IF NOT EXISTS "Report" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "analysisData" JSONB,
    "avgResponseScore" DOUBLE PRECISION,
    "avgVoiceToneScore" DOUBLE PRECISION,
    "avgBodyLanguageScore" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- UserMemory table
CREATE TABLE IF NOT EXISTS "UserMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserMemory_pkey" PRIMARY KEY ("id")
);

-- SkillSnapshot table
CREATE TABLE IF NOT EXISTS "SkillSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillSnapshot_pkey" PRIMARY KEY ("id")
);

-- UserAggregate table
CREATE TABLE IF NOT EXISTS "UserAggregate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avgScore" DOUBLE PRECISION,
    "lastInterview" TIMESTAMP(3),
    "strengths" JSONB,
    "weaknesses" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserAggregate_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "Report_interviewId_key" ON "Report"("interviewId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserAggregate_userId_key" ON "UserAggregate"("userId");

-- Indexes
CREATE INDEX IF NOT EXISTS "Question_interviewId_idx" ON "Question"("interviewId");
CREATE INDEX IF NOT EXISTS "Transcript_interviewId_idx" ON "Transcript"("interviewId");
CREATE INDEX IF NOT EXISTS "Transcript_questionId_idx" ON "Transcript"("questionId");
CREATE INDEX IF NOT EXISTS "Report_interviewId_idx" ON "Report"("interviewId");
CREATE INDEX IF NOT EXISTS "UserMemory_userId_idx" ON "UserMemory"("userId");
CREATE INDEX IF NOT EXISTS "SkillSnapshot_userId_idx" ON "SkillSnapshot"("userId");

-- Foreign keys
ALTER TABLE "Question" ADD CONSTRAINT "Question_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
