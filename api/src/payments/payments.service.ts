import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // WHY: Automatically run monthly fee auto-billing on server startup asynchronously to avoid blocking boot.
    this.autoIssueMonthlyBills().catch((err) => {
      console.error('Error running startup monthly fee auto-billing:', err);
    });
  }

  async autoIssueMonthlyBills() {
    // WHY: Automatically run monthly fee billing for all active FIXED players on the 1st of each month.
    // To ensure reliability even if the server restarts or goes down, we run this check dynamically
    // and look for any existing 14.00 € payment created in the current month for each player.
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const fixedPlayers = await this.prisma.player.findMany({
      where: { playerType: 'FIXED' },
    });

    for (const player of fixedPlayers) {
      const existingBill = await this.prisma.payment.findFirst({
        where: {
          playerId: player.id,
          amount: new Prisma.Decimal('14.00'),
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          deletedAt: null,
        },
      });

      if (!existingBill) {
        // WHY: Issue the 14.00 € monthly fee pending bill automatically.
        await this.prisma.payment.create({
          data: {
            playerId: player.id,
            amount: new Prisma.Decimal('14.00'),
            status: 'PENDING',
          },
        });
      }
    }
  }

  async create(createPaymentDto: CreatePaymentDto) {
    // WHY: Verify the player profile exists before recording a payment against them.
    const player = await this.prisma.player.findUnique({
      where: { id: createPaymentDto.playerId },
    });
    if (!player) {
      throw new NotFoundException(`Player with ID ${createPaymentDto.playerId} not found`);
    }

    // WHY: Amounts must be strictly handled as Decimal values to prevent float precision rounding errors.
    const amountDecimal = new Prisma.Decimal(createPaymentDto.amount);

    return this.prisma.payment.create({
      data: {
        playerId: createPaymentDto.playerId,
        amount: amountDecimal,
        status: 'PENDING',
      },
    });
  }

  async findAll(query: QueryPaymentDto, reqUser: { userId: string; role: string }) {
    // WHY: Trigger monthly fee auto-billing in the background dynamically to ensure up-to-date monthly ledgers
    // even if the server runs continuously without restarting on the 1st of the month.
    this.autoIssueMonthlyBills().catch((err) => {
      console.error('Error running background monthly fee auto-billing:', err);
    });

    const { cursor, limit = 10 } = query;
    const take = limit + 1;

    let playerIdFilter: string | undefined = undefined;

    // WHY: Security boundary: A standard USER can ONLY view payments corresponding to their own player profile.
    if (reqUser.role === 'USER') {
      const user = await this.prisma.user.findUnique({
        where: { id: reqUser.userId },
      });
      
      if (!user || !user.playerId) {
        // If a user account isn't linked to any player profile, we safely return an empty result.
        return {
          data: [],
          nextCursor: null,
        };
      }
      playerIdFilter = user.playerId;
    }

    // WHY: Filter out soft deleted records (`deletedAt: null`) to ensure they don't show up in normal screens.
    const payments = await this.prisma.payment.findMany({
      take,
      where: {
        deletedAt: null,
        ...(playerIdFilter && { playerId: playerIdFilter }),
      },
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      include: {
        player: true,
      },
      orderBy: { createdAt: 'desc' }, // Latest payments first
    });

    let nextCursor: string | null = null;
    if (payments.length > limit) {
      const nextItem = payments.pop();
      nextCursor = nextItem!.id;
    }

    return {
      data: payments,
      nextCursor,
    };
  }

  async pay(id: string) {
    // WHY: ACID transactions guarantee data safety. We ensure the status transition to PAID is atomic.
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
      });

      if (!payment) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }

      if (payment.status !== 'PENDING') {
        throw new BadRequestException(`Cannot process payment. Current status is ${payment.status}`);
      }

      return tx.payment.update({
        where: { id },
        data: { status: 'PAID' },
      });
    });
  }

  async cancel(id: string) {
    // WHY: Enforce transaction isolation. Only PENDING payments can be cancelled.
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
      });

      if (!payment) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }

      if (payment.status !== 'PENDING') {
        throw new BadRequestException(`Cannot cancel payment. Current status is ${payment.status}`);
      }

      return tx.payment.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });
  }

  async remove(id: string) {
    // WHY: Audit trails requirement. Instead of physical deletion, we mark deletedAt (Soft Delete).
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return this.prisma.payment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
