-- CreateTable
CREATE TABLE "LogbookPayment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mainCategory" TEXT,
    "subCategory" TEXT,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runningBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "LogbookPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogbookPayment_userId_paymentDate_idx" ON "LogbookPayment"("userId", "paymentDate");

-- AddForeignKey
ALTER TABLE "LogbookPayment" ADD CONSTRAINT "LogbookPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
