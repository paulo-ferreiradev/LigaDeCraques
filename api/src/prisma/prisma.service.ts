import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export type { PrismaClient as GeneratedPrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'; // New: Prisma Adapter
import { Pool } from 'pg'; // New: Connection pool manager
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import 'dotenv/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // 1. We create a "Pool" (a group of connections) with the pg library
    // WHY: Configure SSL options to bypass self-signed certificate constraints when connecting to hosted DBs like Supabase.
    const connectionString = process.env.DATABASE_URL as string;
    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    // 2. We put the Pool inside the Prisma 7 Adapter
    const adapter = new PrismaPg(pool);

    // 3. We give the adapter to Prisma! (No more datasourceUrl)
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();

    // WHY: Self-healing bootstrap. Automatically provision the master Admin account in the database
    // on startup if it doesn't exist, using credentials from environment variables.
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const normalizedEmail = adminEmail.trim().toLowerCase();
      const existingAdmin = await this.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!existingAdmin) {
        console.log(`[Bootstrap] Auto-provisioning master Admin account: ${normalizedEmail}`);
        const adminId = randomUUID();
        const passwordHash = await bcrypt.hash(adminPassword, 10);

        try {
          await this.$transaction(async (tx) => {
            // Atomically create Player profile
            await tx.player.create({
              data: {
                id: adminId,
                name: 'Admin',
                playerType: 'FIXED',
              },
            });

            // Atomically create matching Admin User account
            await tx.user.create({
              data: {
                id: adminId,
                email: normalizedEmail,
                passwordHash,
                role: 'ADMIN',
                playerId: adminId,
              },
            });
          });
          console.log('[Bootstrap] Master Admin account provisioned successfully.');
        } catch (err) {
          console.error('[Bootstrap] Failed to auto-provision master Admin account:', err);
        }
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
