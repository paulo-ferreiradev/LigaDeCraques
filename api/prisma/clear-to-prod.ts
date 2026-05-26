// WHY: Force Node.js to accept self-signed SSL certificates for standalone production bootstrap database cleanups.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcrypt';

// WHY: Load environment variables directly in standalone ts-node execution context.
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
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // WHY: Secure check. Prevents running cleanup if the user forgot to configure credentials in their local .env file.
  if (!adminEmail || !adminPassword) {
    console.error('\n[ERROR] Missing production variables!');
    console.error('Please configure ADMIN_EMAIL and ADMIN_PASSWORD in your api/.env file first.');
    console.error('Example:\nADMIN_EMAIL=paulo@gmail.com\nADMIN_PASSWORD=MySecurePassword123!\n');
    process.exit(1);
  }

  console.log('\nStarting production database cleanup...');

  // WHY: We wipe all mock records in reverse foreign key order to prepare a completely clean playground.
  await prisma.payment.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.player.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.season.deleteMany({});

  console.log('Database truncated successfully (all test tables are now empty).');

  // WHY: Salt and hash the production administrator password securely.
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // WHY: Insert the single MASTER ADMIN account. This account has no linked player initially.
  // The Admin can log in and use Swagger or future dashboards to create players and link themselves later.
  const admin = await prisma.user.create({
    data: {
      email: adminEmail.trim().toLowerCase(),
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`\n[SUCCESS] Created production MASTER ADMIN user: ${admin.email}`);
  console.log('Your database is now clean, secured, and ready for production!');
}

main()
  .catch((e) => {
    console.error('Error preparing production database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end(); // WHY: We must close the pg pool to allow the ts-node process to terminate cleanly.
  });
