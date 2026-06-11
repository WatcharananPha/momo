/*
  Warnings:

  - The values [SUSPENDED] on the enum `MaidStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [PAID] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [EARN,REDEEM,EXPIRE,ADJUST] on the enum `PointTransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `name` on the `campaigns` table. All the data in the column will be lost.
  - The primary key for the `guest_sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `expired_at` on the `guest_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `maid_skills` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `memberships` table. All the data in the column will be lost.
  - You are about to drop the column `joined_at` on the `memberships` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `memberships` table. All the data in the column will be lost.
  - You are about to drop the column `channel` on the `notification_logs` table. All the data in the column will be lost.
  - You are about to drop the column `event_type` on the `notification_logs` table. All the data in the column will be lost.
  - You are about to drop the column `retry_count` on the `notification_logs` table. All the data in the column will be lost.
  - You are about to drop the column `sent_at` on the `notification_logs` table. All the data in the column will be lost.
  - You are about to drop the column `charge_id` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `paid_at` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `refunded_at` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `point_rules` table. All the data in the column will be lost.
  - You are about to drop the column `valid_from` on the `point_rules` table. All the data in the column will be lost.
  - You are about to drop the column `valid_until` on the `point_rules` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `slip_uploads` table. All the data in the column will be lost.
  - You are about to drop the column `phone_number` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `maid_onboarding` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `minigame_rewards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `packages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscriptions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[guest_uuid]` on the table `guest_sessions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[token]` on the table `guest_sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `title` to the `campaigns` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `credit_transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `expires_at` to the `guest_sessions` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `guest_sessions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `token` to the `guest_sessions` table without a default value. This is not possible if the table is not empty.
  - Made the column `user_id` on table `maids` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updated_at` to the `memberships` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `notification_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `notification_logs` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `notification_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `method` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Made the column `display_name` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('TOP_UP', 'BOOKING', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT_CARD', 'PROMPTPAY', 'CREDIT_WALLET', 'TRUE_MONEY', 'SHOPEE_PAY');

-- AlterEnum
BEGIN;
CREATE TYPE "MaidStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'ON_JOB', 'INACTIVE');
ALTER TABLE "maids" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "maids" ALTER COLUMN "status" TYPE "MaidStatus_new" USING ("status"::text::"MaidStatus_new");
ALTER TYPE "MaidStatus" RENAME TO "MaidStatus_old";
ALTER TYPE "MaidStatus_new" RENAME TO "MaidStatus";
DROP TYPE "MaidStatus_old";
ALTER TABLE "maids" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PointTransactionType_new" AS ENUM ('BOOKING_EARNED', 'REVIEW_BONUS', 'ONBOARDING', 'REFERRAL', 'CAMPAIGN_REWARD', 'SPIN_WHEEL', 'REDEEMED');
ALTER TABLE "point_transactions" ALTER COLUMN "type" TYPE "PointTransactionType_new" USING ("type"::text::"PointTransactionType_new");
ALTER TYPE "PointTransactionType" RENAME TO "PointTransactionType_old";
ALTER TYPE "PointTransactionType_new" RENAME TO "PointTransactionType";
DROP TYPE "PointTransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "maid_onboarding" DROP CONSTRAINT "maid_onboarding_maid_id_fkey";

-- DropForeignKey
ALTER TABLE "minigame_rewards" DROP CONSTRAINT "minigame_rewards_campaign_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_package_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_user_id_fkey";

-- DropIndex
DROP INDEX "bookings_scheduled_at_idx";

-- DropIndex
DROP INDEX "bookings_status_idx";

-- DropIndex
DROP INDEX "customer_tags_user_id_idx";

-- DropIndex
DROP INDEX "maid_skills_maid_id_skill_key";

-- DropIndex
DROP INDEX "payments_status_idx";

-- DropIndex
DROP INDEX "payments_user_id_idx";

-- DropIndex
DROP INDEX "point_transactions_created_at_idx";

-- DropIndex
DROP INDEX "point_transactions_type_idx";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "current_lat" DOUBLE PRECISION,
ADD COLUMN     "current_lng" DOUBLE PRECISION,
ADD COLUMN     "customer_lat" DOUBLE PRECISION,
ADD COLUMN     "customer_lng" DOUBLE PRECISION,
ADD COLUMN     "last_location_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "campaigns" DROP COLUMN "name",
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "credit_transactions" DROP COLUMN "type",
ADD COLUMN     "type" "CreditTransactionType" NOT NULL,
ALTER COLUMN "reference_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "guest_sessions" DROP CONSTRAINT "guest_sessions_pkey",
DROP COLUMN "expired_at",
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "id" UUID NOT NULL,
ADD COLUMN     "token" TEXT NOT NULL,
ALTER COLUMN "guest_uuid" SET DATA TYPE TEXT,
ADD CONSTRAINT "guest_sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "maid_skills" DROP COLUMN "rating";

-- AlterTable
ALTER TABLE "maids" ADD COLUMN     "test_score" INTEGER,
ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "memberships" DROP COLUMN "expires_at",
DROP COLUMN "joined_at",
DROP COLUMN "status",
ADD COLUMN     "next_tier_points" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "notification_logs" DROP COLUMN "channel",
DROP COLUMN "event_type",
DROP COLUMN "retry_count",
DROP COLUMN "sent_at",
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "charge_id",
DROP COLUMN "paid_at",
DROP COLUMN "provider",
DROP COLUMN "refunded_at",
DROP COLUMN "updated_at",
ADD COLUMN     "external_transaction_id" TEXT,
ADD COLUMN     "method" "PaymentMethod" NOT NULL,
ALTER COLUMN "metadata" DROP NOT NULL;

-- AlterTable
ALTER TABLE "point_rules" DROP COLUMN "type",
DROP COLUMN "valid_from",
DROP COLUMN "valid_until";

-- AlterTable
ALTER TABLE "point_transactions" ALTER COLUMN "source" DROP NOT NULL,
ALTER COLUMN "reference_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "slip_uploads" DROP COLUMN "amount";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "phone_number",
ALTER COLUMN "display_name" SET NOT NULL;

-- DropTable
DROP TABLE "maid_onboarding";

-- DropTable
DROP TABLE "minigame_rewards";

-- DropTable
DROP TABLE "packages";

-- DropTable
DROP TABLE "subscriptions";

-- DropEnum
DROP TYPE "MembershipStatus";

-- DropEnum
DROP TYPE "NotificationStatus";

-- DropEnum
DROP TYPE "PaymentProvider";

-- CreateTable
CREATE TABLE "credit_packages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_rewards" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "rewardType" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "campaign_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_transactions_wallet_id_idx" ON "credit_transactions"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "guest_sessions_guest_uuid_key" ON "guest_sessions"("guest_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "guest_sessions_token_key" ON "guest_sessions"("token");

-- CreateIndex
CREATE INDEX "maid_skills_maid_id_idx" ON "maid_skills"("maid_id");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- AddForeignKey
ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_converted_to_user_id_fkey" FOREIGN KEY ("converted_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maids" ADD CONSTRAINT "maids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_rewards" ADD CONSTRAINT "campaign_rewards_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_uploads" ADD CONSTRAINT "slip_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
