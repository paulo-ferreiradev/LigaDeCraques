// WHY: Force Node.js to accept self-signed SSL certificates for standalone database seeding.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcrypt';

// WHY: Load environment variables directly in standalone ts-node execution context.
dotenv.config({ path: resolve(process.cwd(), '.env') });

// WHY: In Prisma 7, we must configure and pass the pg driver adapter to PrismaClient.
// We add 'ssl: { rejectUnauthorized: false }' to bypass self-signed certificate constraints in hosted DBs like Supabase.
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
  console.log('Starting database seeding with PrismaPg adapter and SSL...');

  // WHY: To prevent referential integrity errors during subsequent executions of the seed script,
  // we truncate/delete all tables in the reverse order of their foreign key dependencies.
  await prisma.payment.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.player.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.season.deleteMany({});

  console.log('Database cleared of existing records.');

  // 1. Create a Season
  // WHY: Provides a default active season context so scheduled matches and player stats have a target.
  const season = await prisma.season.create({
    data: {
      year: 2026,
      seasonType: 'SUMMER',
      status: 'ACTIVE',
    },
  });
  console.log(`Created Season: ${season.year} (${season.seasonType})`);

  // 2. Create Players
  // WHY: Populate with 10 legendary profiles to set up a realistic match environment (two 4-player teams + 2 extra).
  const playersData = [
    { name: 'Cristiano Ronaldo' },
    { name: 'Lionel Messi' },
    { name: 'Neymar Jr' },
    { name: 'Kylian Mbappe' },
    { name: 'Erling Haaland' },
    { name: 'Kevin De Bruyne' },
    { name: 'Luka Modric' },
    { name: 'Bruno Fernandes' },
    { name: 'Bernardo Silva' },
    { name: 'Joao Felix' },
  ];

  const players: any[] = [];
  for (const p of playersData) {
    const player = await prisma.player.create({
      data: p,
    });
    players.push(player);
  }
  console.log(`Created ${players.length} players.`);

  // 3. Create Users
  // WHY: Establish realistic user credentials with different roles (Admin, Treasurer, and Users)
  // to verify permission scopes and guards. Password is 'StrongPassword123!' salted 10 times.
  const passwordHash = await bcrypt.hash('StrongPassword123!', 10);

  // Admin: linked to Cristiano Ronaldo
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ligacraques.com',
      passwordHash,
      role: 'ADMIN',
      playerId: players[0].id,
    },
  });
  console.log(`Created Admin User: ${adminUser.email}`);

  // Treasurer: linked to Lionel Messi
  const treasurerUser = await prisma.user.create({
    data: {
      email: 'tesoureiro@ligacraques.com',
      passwordHash,
      role: 'TREASURER',
      playerId: players[1].id,
    },
  });
  console.log(`Created Treasurer User: ${treasurerUser.email}`);

  // Normal Users: Neymar Jr and Kylian Mbappe
  const user1 = await prisma.user.create({
    data: {
      email: 'neymar@ligacraques.com',
      passwordHash,
      role: 'USER',
      playerId: players[2].id,
    },
  });
  const user2 = await prisma.user.create({
    data: {
      email: 'mbappe@ligacraques.com',
      passwordHash,
      role: 'USER',
      playerId: players[3].id,
    },
  });
  console.log(`Created normal users: ${user1.email}, ${user2.email}`);

  // 4. Create Matches
  // WHY: Pre-populating matches allows us to test dynamic leaderboard calculations and point awards.
  
  // Match 1: Completed. Team A Wins (4-2). Cristiano Ronaldo is MVP.
  // Team A: Cristiano, De Bruyne, Modric, Bernardo (ID: 0, 5, 6, 8)
  // Team B: Messi, Neymar, Mbappe, Haaland (ID: 1, 2, 3, 4)
  await prisma.match.create({
    data: {
      seasonId: season.id,
      playedAt: new Date('2026-05-10T20:00:00Z'),
      status: 'COMPLETED',
      teamAScore: 4,
      teamBScore: 2,
      teamAPlayers: {
        connect: [
          { id: players[0].id },
          { id: players[5].id },
          { id: players[6].id },
          { id: players[8].id },
        ],
      },
      teamBPlayers: {
        connect: [
          { id: players[1].id },
          { id: players[2].id },
          { id: players[3].id },
          { id: players[4].id },
        ],
      },
      mvpId: players[0].id, // Cristiano Ronaldo MVP
    },
  });
  console.log(`Created Completed Match 1 (Team A wins 4-2, MVP: ${players[0].name})`);

  // Match 2: Completed. Draw (3-3). Lionel Messi is MVP.
  // Team A: Cristiano, Neymar, Modric, Bruno (ID: 0, 2, 6, 7)
  // Team B: Messi, Mbappe, Haaland, Bernardo (ID: 1, 3, 4, 8)
  await prisma.match.create({
    data: {
      seasonId: season.id,
      playedAt: new Date('2026-05-17T20:00:00Z'),
      status: 'COMPLETED',
      teamAScore: 3,
      teamBScore: 3,
      teamAPlayers: {
        connect: [
          { id: players[0].id },
          { id: players[2].id },
          { id: players[6].id },
          { id: players[7].id },
        ],
      },
      teamBPlayers: {
        connect: [
          { id: players[1].id },
          { id: players[3].id },
          { id: players[4].id },
          { id: players[8].id },
        ],
      },
      mvpId: players[1].id, // Lionel Messi MVP
    },
  });
  console.log(`Created Completed Match 2 (Draw 3-3, MVP: ${players[1].name})`);

  // Match 3: Scheduled. Not completed yet. No scores or MVP.
  await prisma.match.create({
    data: {
      seasonId: season.id,
      playedAt: new Date('2026-06-01T20:00:00Z'),
      status: 'SCHEDULED',
      teamAPlayers: {
        connect: [
          { id: players[0].id },
          { id: players[1].id },
          { id: players[2].id },
        ],
      },
      teamBPlayers: {
        connect: [
          { id: players[3].id },
          { id: players[4].id },
          { id: players[5].id },
        ],
      },
    },
  });
  console.log('Created Scheduled Match 3');

  // 5. Create Payments
  // WHY: Pre-populating payments validates Treasurer aggregation reports, soft deletes, and user filters.

  // Cristiano: 1 PAID payment (50.00)
  await prisma.payment.create({
    data: {
      playerId: players[0].id,
      amount: new Prisma.Decimal(50.00),
      status: 'PAID',
    },
  });

  // Messi: 1 PAID (50.00), 1 PENDING (50.00)
  await prisma.payment.create({
    data: {
      playerId: players[1].id,
      amount: new Prisma.Decimal(50.00),
      status: 'PAID',
    },
  });
  await prisma.payment.create({
    data: {
      playerId: players[1].id,
      amount: new Prisma.Decimal(50.00),
      status: 'PENDING',
    },
  });

  // Neymar: 1 PENDING (30.00), 1 CANCELLED (50.00)
  await prisma.payment.create({
    data: {
      playerId: players[2].id,
      amount: new Prisma.Decimal(30.00),
      status: 'PENDING',
    },
  });
  await prisma.payment.create({
    data: {
      playerId: players[2].id,
      amount: new Prisma.Decimal(50.00),
      status: 'CANCELLED',
    },
  });

  // Mbappe: 1 PAID payment (50.00) + 1 soft-deleted billing record
  await prisma.payment.create({
    data: {
      playerId: players[3].id,
      amount: new Prisma.Decimal(50.00),
      status: 'PAID',
    },
  });
  await prisma.payment.create({
    data: {
      playerId: players[3].id,
      amount: new Prisma.Decimal(50.00),
      status: 'PENDING',
      deletedAt: new Date(), // Soft delete simulated!
    },
  });

  console.log('Created billing logs with multiple states (PAID, PENDING, CANCELLED, soft-deleted).');
  console.log('Database seeding process completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end(); // WHY: We must close the pg pool to allow the ts-node process to terminate cleanly.
  });
