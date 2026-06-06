/// <reference types="node" />
/**
 * Prisma Seed — bootstraps mandatory reference data.
 * Run: npm run prisma:seed
 */
import { PrismaClient, PointTransactionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding reference data…');

  // ── Tier Rules ──────────────────────────────────────────────────────────────
  const tiers = [
    {
      tierName: 'SILVER',
      minPoints: 0,
      maxPoints: 4999,
      benefits: {
        discount: 0,
        priority_booking: false,
        free_delivery: false,
      },
    },
    {
      tierName: 'GOLD',
      minPoints: 5000,
      maxPoints: 19999,
      benefits: {
        discount: 5,
        priority_booking: true,
        free_delivery: false,
      },
    },
    {
      tierName: 'PLATINUM',
      minPoints: 20000,
      maxPoints: null,
      benefits: {
        discount: 10,
        priority_booking: true,
        free_delivery: true,
      },
    },
  ];

  for (const tier of tiers) {
    await prisma.tierRule.upsert({
      where: { tierName: tier.tierName },
      update: tier,
      create: tier,
    });
  }
  console.log(`  ✅ TierRules: ${tiers.length} records`);

  // ── Point Rules ─────────────────────────────────────────────────────────────
  const pointRules = [
    {
      ruleName: 'ONBOARDING',
      type: PointTransactionType.ONBOARDING,
      pointAmount: parseInt(process.env.ONBOARDING_POINT_AMOUNT ?? '100', 10),
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: null,
    },
    {
      ruleName: 'EARN_BOOKING',
      type: PointTransactionType.EARN,
      pointAmount: parseInt(process.env.EARN_RATE_PER_THB ?? '1', 10),
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: null,
    },
    {
      ruleName: 'REDEEM_STANDARD',
      type: PointTransactionType.REDEEM,
      pointAmount: 100, // 100 pts minimum per redemption
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: null,
    },
  ];

  for (const rule of pointRules) {
    await prisma.pointRule.upsert({
      where: { ruleName: rule.ruleName },
      update: rule,
      create: rule,
    });
  }
  console.log(`  ✅ PointRules: ${pointRules.length} records`);

  console.log('🌱 Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
