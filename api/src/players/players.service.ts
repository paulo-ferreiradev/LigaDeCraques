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
    return this.prisma.player.findMany({
      orderBy: { name: 'asc' }, // Always return sorted lists for better UX.
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

    return this.prisma.player.update({
      where: { id },
      data: updatePlayerDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.player.delete({
      where: { id },
    });
  }
}
