/*
  Warnings:

  - You are about to drop the column `embeddingId` on the `UserMemory` table. All the data in the column will be lost.
  - You are about to drop the `user_memory_vectors` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "UserMemory" DROP COLUMN "embeddingId";

-- DropTable
DROP TABLE "public"."user_memory_vectors";
