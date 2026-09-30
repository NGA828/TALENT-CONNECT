-- Licence fees are now collected the Cameroonian way: MTN Mobile Money (*126#) or Orange
-- Money (#150#) transfers that an administrator confirms, instead of the placeholder card
-- sandbox. Card columns are dropped, the Mobile Money details of a transfer are added and
-- administrators get a Setting table to manage the fee itself.
-- Existing rows keep their status, amount and currency; the card data they held is removed.

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTable (SQLite): card columns are replaced by Mobile Money transfer details.
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promoterId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'LICENCE_FEE',
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "transactionRef" TEXT,
    "payerName" TEXT,
    "payerPhone" TEXT,
    "receiptUrl" TEXT,
    "failureReason" TEXT,
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "description" TEXT,
    "submittedAt" DATETIME,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("id", "promoterId", "purpose", "amount", "currency", "status", "provider", "providerRef", "failureReason", "description", "createdAt", "updatedAt")
SELECT "id", "promoterId", "purpose", "amount", "currency", "status", "provider", "providerRef", "failureReason", "description", "createdAt", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE INDEX "Payment_promoterId_status_idx" ON "Payment"("promoterId", "status");
CREATE INDEX "Payment_status_submittedAt_idx" ON "Payment"("status", "submittedAt");
PRAGMA foreign_keys=ON;
