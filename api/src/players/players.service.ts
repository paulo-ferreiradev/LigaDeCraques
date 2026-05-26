import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPlayerDto: CreatePlayerDto) {
    // We use the prisma client to persist the new player.
    // Typescript ensures createPlayerDto matches the expected shape.
    return this.prisma.player.create({
      data: createPlayerDto,
    });
  }

  async findAll() {
    // Access the database to retrieve all players. This returns an array of player objects.
    return this.prisma.player.findMany({
      orderBy: { name: 'asc' }, // Ensure we only return players with a valid ID
      include: {
        _count: {
          select: { mvpAwards: true }, // Include the count of awards for each player
        },
      },
    });
  }

  async findOne(id: string) {
    // CHANGED: id is a String (UUID)
    const player = await this.prisma.player.findUnique({
      where: { id },
    });

    if (!player) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }

    return player;
  }

  async update(id: string, updatePlayerDto: UpdatePlayerDto) {
    // Ensure the player exists before attempting update.
    await this.findOne(id);

    const { role, ...playerData } = updatePlayerDto;

    // WHY: If role property is supplied, propagate the update to the linked User model.
    if (role) {
      const linkedUser = await this.prisma.user.findUnique({
        where: { playerId: id },
      });
      if (linkedUser) {
        await this.prisma.user.update({
          where: { id: linkedUser.id },
          data: { role },
        });
      }
    }

    return this.prisma.player.update({
      where: { id },
      data: playerData,
      include: {
        user: true, // WHY: Fetch user relation so frontend displays system role badge instantly
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.player.delete({
      where: { id },
    });
  }
}
