-- AlterTable
ALTER TABLE "user"."Message" ADD COLUMN     "replyToId" TEXT;

-- CreateTable
CREATE TABLE "user"."attachment" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "metadata" JSONB,
    "messageId" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user"."Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "user"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user"."attachment" ADD CONSTRAINT "attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "user"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
