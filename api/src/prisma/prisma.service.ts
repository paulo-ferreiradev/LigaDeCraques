import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // OnModuleInit ensures the database connection is established
  // exactly when the application starts, preventing cold-start delays.
  async onModuleInit() {
    await this.$connect();
  }

  // OnModuleDestroy ensures the database connection is closed gracefully
  // during hot-reloads or shutdowns.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
