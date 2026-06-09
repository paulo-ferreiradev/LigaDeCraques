// WHY: Force Node.js to accept self-signed SSL certificates for standalone database scripts.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// WHY: Load environment variables directly in standalone ts-node execution context.
dotenv.config({ path: resolve(process.cwd(), '.env') });

// WHY: In Prisma 7, we must configure and pass the pg driver adapter to PrismaClient.
// We bypass self-signed certificate constraints for hosted DBs like Supabase.
const connectionString = process.env.DATABASE_URL as string;
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// WHY: One-time, idempotent migration helper. After moving the Hall of Fame to a single source of
// truth (the Award table), seasons that were already FINISHED before that refactor have a
// championId but no backing CHAMPION Award, so they would silently vanish from the Hall of Fame.
// This backfills the missing awards. Safe to re-run — the upsert keyed on
// [playerId, seasonId, type] makes each season's award converge rather than duplicate.
async function main() {
  console.log('Backfilling CHAMPION awards for previously-finished seasons...');

  const seasons = await prisma.season.findMany({
    where: { status: 'FINISHED', championId: { not: null } },
  });

  console.log(`Found ${seasons.length} finished season(s) with a champion.`);

  let created = 0;
  let alreadyPresent = 0;

  for (const season of seasons) {
    const championId = season.championId as string;

    const existing = await prisma.award.findUnique({
      where: {
        playerId_seasonId_type: {
          playerId: championId,
          seasonId: season.id,
          type: 'CHAMPION',
        },
      },
    });

    await prisma.award.upsert({
      where: {
        playerId_seasonId_type: {
          playerId: championId,
          seasonId: season.id,
          type: 'CHAMPION',
        },
      },
      update: {
        year: season.year,
        title: `Champion ${season.year} ${season.seasonType}`,
      },
      create: {
        playerId: championId,
        seasonId: season.id,
        type: 'CHAMPION',
        year: season.year,
        title: `Champion ${season.year} ${season.seasonType}`,
      },
    });

    if (existing) {
      alreadyPresent += 1;
    } else {
      created += 1;
      console.log(
        `  + Award created: ${season.year} ${season.seasonType} -> champion ${championId}`,
      );
    }
  }

  console.log(
    `Backfill complete. Created: ${created}, already present (skipped): ${alreadyPresent}.`,
  );
}

main()
  .catch((e) => {
    console.error('Error during champion award backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end(); // WHY: Close the pg pool so the ts-node process terminates cleanly.
  });
