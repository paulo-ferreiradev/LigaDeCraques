/*
  Warnings:

  - You are about to drop the `Award` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlayerMatchRecord` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Season` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Award" DROP CONSTRAINT "Award_playerId_fkey";

-- DropForeignKey
ALTER TABLE "Award" DROP CONSTRAINT "Award_seasonId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerMatchRecord" DROP CONSTRAINT "PlayerMatchRecord_matchId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerMatchRecord" DROP CONSTRAINT "PlayerMatchRecord_playerId_fkey";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "mvpId" TEXT,
ADD COLUMN     "teamAScore" INTEGER,
ADD COLUMN     "teamBScore" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Season" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "Award";

-- DropTable
DROP TABLE "PlayerMatchRecord";

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TeamAMatches" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TeamAMatches_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TeamBMatches" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TeamBMatches_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TeamAMatches_B_index" ON "_TeamAMatches"("B");

-- CreateIndex
CREATE INDEX "_TeamBMatches_B_index" ON "_TeamBMatches"("B");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_mvpId_fkey" FOREIGN KEY ("mvpId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamAMatches" ADD CONSTRAINT "_TeamAMatches_A_fkey" FOREIGN KEY ("A") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamAMatches" ADD CONSTRAINT "_TeamAMatches_B_fkey" FOREIGN KEY ("B") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamBMatches" ADD CONSTRAINT "_TeamBMatches_A_fkey" FOREIGN KEY ("A") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamBMatches" ADD CONSTRAINT "_TeamBMatches_B_fkey" FOREIGN KEY ("B") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
