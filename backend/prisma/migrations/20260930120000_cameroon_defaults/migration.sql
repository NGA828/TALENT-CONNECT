-- Change defaults only; existing monetary values and currencies are preserved.
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "talentId" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "contractDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terms" TEXT NOT NULL,
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "documentUrl" TEXT,
    "documentName" TEXT,
    "reviewNotes" TEXT,
    "talentResponseNote" TEXT,
    "respondedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contract_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contract_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Contract" ("id", "talentId", "promoterId", "eventId", "contractDate", "terms", "amount", "currency", "documentUrl", "documentName", "reviewNotes", "talentResponseNote", "respondedAt", "status", "createdAt", "updatedAt") SELECT "id", "talentId", "promoterId", "eventId", "contractDate", "terms", "amount", "currency", "documentUrl", "documentName", "reviewNotes", "talentResponseNote", "respondedAt", "status", "createdAt", "updatedAt" FROM "Contract";
DROP TABLE "Contract";
ALTER TABLE "new_Contract" RENAME TO "Contract";
CREATE INDEX "Contract_talentId_status_idx" ON "Contract"("talentId", "status");
CREATE INDEX "Contract_promoterId_status_idx" ON "Contract"("promoterId", "status");
CREATE INDEX "Contract_eventId_idx" ON "Contract"("eventId");
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promoterId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'LICENCE_FEE',
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "failureReason" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("id", "promoterId", "purpose", "amount", "currency", "status", "provider", "providerRef", "cardBrand", "cardLast4", "failureReason", "description", "createdAt", "updatedAt") SELECT "id", "promoterId", "purpose", "amount", "currency", "status", "provider", "providerRef", "cardBrand", "cardLast4", "failureReason", "description", "createdAt", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE INDEX "Payment_promoterId_status_idx" ON "Payment"("promoterId", "status");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
