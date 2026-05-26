// WHY: Bypass SSL constraints to directly query the database and inspect tables.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL as string;
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== DATABASE DIAGNOSTICS ===');
  
  // 1. Check Users
  const users = await prisma.user.findMany();
  console.log(`\n[Users] Found ${users.length} user(s):`);
  users.forEach((u) => {
    console.log(`- ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | PlayerId: ${u.playerId}`);
  });

  // 2. Check Players
  const players = await prisma.player.findMany();
  console.log(`\n[Players] Found ${players.length} player(s):`);
  players.forEach((p) => {
    console.log(`- ID: ${p.id} | Name: ${p.name}`);
  });

  // 3. Check Seasons
  const seasons = await prisma.season.findMany();
  console.log(`\n[Seasons] Found ${seasons.length} season(s):`);
  seasons.forEach((s) => {
    console.log(`- ID: ${s.id} | Year: ${s.year} | Type: ${s.seasonType} | Status: ${s.status}`);
  });

  // 4. Check Matches
  const matches = await prisma.match.findMany({
    include: {
      season: true,
      teamAPlayers: true,
      teamBPlayers: true,
    },
  });
  console.log(`\n[Matches] Found ${matches.length} match(es):`);
  matches.forEach((m) => {
    console.log(`- ID: ${m.id} | Season: ${m.season.year} ${m.season.seasonType} | PlayedAt: ${m.playedAt} | Status: ${m.status} | Team A: ${m.teamAPlayers.length} players | Team B: ${m.teamBPlayers.length} players`);
  });
}

main()
  .catch((e) => {
    console.error('Error querying database:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
