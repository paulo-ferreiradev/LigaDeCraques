import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'; // New: Prisma Adapter
import { Pool } from 'pg'; // New: Connection pool manager
import 'dotenv/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // 1. We create a "Pool" (a group of connections) with the pg library
    const connectionString = process.env.DATABASE_URL as string;
    const pool = new Pool({ connectionString });

    // 2. We put the Pool inside the Prisma 7 Adapter
    const adapter = new PrismaPg(pool);

    // 3. We give the adapter to Prisma! (No more datasourceUrl)
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
