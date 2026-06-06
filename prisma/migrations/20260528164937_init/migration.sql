/*
  Warnings:

  - The values [DINING,ACTIVITY,SERVICE] on the enum `BookingType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[referral_code]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MaidTier" AS ENUM ('TRAINEE', 'PRO', 'ELITE', 'MASTER');

-- CreateEnum
CREATE TYPE "MaidStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'AUTO_MATCHING';

-- AlterEnum
BEGIN;
CREATE TYPE "BookingType_new" AS ENUM ('CLEANING', 'COOKING', 'IRONING');
ALTER TABLE "bookings" ALTER COLUMN "type" TYPE "BookingType_new" USING ("type"::text::"BookingType_new");
ALTER TYPE "BookingType" RENAME TO "BookingType_old";
ALTER TYPE "BookingType_new" RENAME TO "BookingType";
DROP TYPE "BookingType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "MembershipTier" ADD VALUE 'DIAMOND';

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'CREDIT';

-- AlterEnum
ALTER TYPE "PointTransactionType" ADD VALUE 'REFERRAL';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "credit_cost" INTEGER,
ADD COLUMN     "maid_id" UUID,
ADD COLUMN     "reroll_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "notification_logs" ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'LINE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "referral_code" TEXT,
ADD COLUMN     "referred_by" UUID;

-- CreateTable
CREATE TABLE "maids" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "profile_picture_url" TEXT,
    "tier" "MaidTier" NOT NULL DEFAULT 'TRAINEE',
    "base_rate" DECIMAL(10,2) NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "job_completed" INTEGER NOT NULL DEFAULT 0,
    "demographics" JSONB DEFAULT '{}',
    "status" "MaidStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maid_skills" (
    "id" UUID NOT NULL,
    "maid_id" UUID NOT NULL,
    "skill" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "maid_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maid_onboarding" (
    "id" UUID NOT NULL,
    "maid_id" UUID NOT NULL,
    "test_score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "documents_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "maid_onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reference_id" UUID,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "credits" INTEGER NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minigame_rewards" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT -1,

    CONSTRAINT "minigame_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maids_user_id_key" ON "maids"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "maid_skills_maid_id_skill_key" ON "maid_skills"("maid_id", "skill");

-- CreateIndex
CREATE UNIQUE INDEX "maid_onboarding_maid_id_key" ON "maid_onboarding"("maid_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_wallets_user_id_key" ON "credit_wallets"("user_id");

-- CreateIndex
CREATE INDEX "bookings_maid_id_idx" ON "bookings"("maid_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- AddForeignKey
ALTER TABLE "maid_skills" ADD CONSTRAINT "maid_skills_maid_id_fkey" FOREIGN KEY ("maid_id") REFERENCES "maids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maid_onboarding" ADD CONSTRAINT "maid_onboarding_maid_id_fkey" FOREIGN KEY ("maid_id") REFERENCES "maids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_wallets" ADD CONSTRAINT "credit_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "credit_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minigame_rewards" ADD CONSTRAINT "minigame_rewards_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_maid_id_fkey" FOREIGN KEY ("maid_id") REFERENCES "maids"("id") ON DELETE SET NULL ON UPDATE CASCADE;
