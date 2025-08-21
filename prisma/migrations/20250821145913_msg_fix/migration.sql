/*
  Warnings:

  - You are about to drop the column `userId` on the `Message` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "user"."Message" DROP CONSTRAINT "Message_userId_fkey";

-- AlterTable
ALTER TABLE "user"."Message" DROP COLUMN "userId";

-- AddForeignKey
ALTER TABLE "user"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
