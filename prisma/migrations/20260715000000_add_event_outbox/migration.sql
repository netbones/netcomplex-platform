-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT,
    "actorId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxDeadLetter" (
    "id" TEXT NOT NULL,
    "outboxId" TEXT,
    "type" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "tenantId" TEXT NOT NULL,
    "correlationId" TEXT,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "handler" TEXT,
    "attempts" INTEGER,
    "deadLetteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxDeadLetter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Outbox_processedAt_idx" ON "Outbox"("processedAt");

-- CreateIndex
CREATE INDEX "Outbox_type_idx" ON "Outbox"("type");

-- CreateIndex
CREATE INDEX "OutboxDeadLetter_type_idx" ON "OutboxDeadLetter"("type");

-- CreateIndex
CREATE INDEX "OutboxDeadLetter_tenantId_idx" ON "OutboxDeadLetter"("tenantId");
