// WHY: Force Node.js process to bypass SSL cert constraints to link the administrator account.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env variables
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
  const email = 'p7paulopt@gmail.com';
  console.log(`Linking player 'Paulo Ferreira' to user '${email}'...`);

  // 1. Verify user exists
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`[ERROR] User with email '${email}' not found in the database.`);
    process.exit(1);
  }

  // 2. Create the real Player profile for Paulo Ferreira
  const player = await prisma.player.create({
    data: {
      name: 'Paulo Ferreira',
    },
  });

  // 3. Link user account to player profile
  await prisma.user.update({
    where: { id: user.id },
    data: {
      playerId: player.id,
    },
  });

  console.log(`[SUCCESS] Linked user account '${email}' to player profile '${player.name}'!`);
}

main()
  .catch((e) => {
    console.error('Error linking profile:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end(); // Clear connection pool cleanly
  });
