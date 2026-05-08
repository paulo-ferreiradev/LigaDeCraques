import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { QuerySeasonDto } from './dto/query-season.dto';

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSeasonDto: CreateSeasonDto) {
    return this.prisma.season.create({
      data: createSeasonDto,
    });
  }

  async findAll(query: QuerySeasonDto) {
    const { cursor, limit = 10 } = query;

    // WHY: We fetch limit + 1 to check if there are more records beyond the requested page.
    const take = limit + 1;

    const seasons = await this.prisma.season.findMany({
      take,
      ...(cursor && {
        skip: 1, // Skip the cursor element itself
        cursor: { id: cursor },
      }),
      orderBy: { createdAt: 'desc' }, // Latest seasons first
    });

    let nextCursor: string | null = null;
    if (seasons.length > limit) {
      const nextItem = seasons.pop();
      nextCursor = nextItem!.id;
    }

    return {
      data: seasons,
      nextCursor,
    };
  }
}
