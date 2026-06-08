import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { LinkUserDto } from './dto/link-user.dto';
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
    // WHY: Access the database to retrieve all players. Include the linked user account (if any)
    // so the admin panel can dynamically check credentials and allow elevating roles (USER -> TREASURER -> ADMIN).
    return this.prisma.player.findMany({
      orderBy: { name: 'asc' },
      include: {
        user: true,
        _count: {
          select: { mvpAwards: true }, // Include the count of awards for each player
        },
      },
    });
  }

  async findOne(id: string) {
    // WHY: Check if the player profile exists in the database.
    const player = await this.prisma.player.findUnique({
      where: { id },
    });

    if (!player) {
      // WHY: Self-Healing Strategy. If the player profile is missing but a corresponding User is authentic and valid,
      // we dynamically create the player profile on-the-fly to prevent rendering blocks on the client-side screens.
      const linkedUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (linkedUser) {
        const defaultName = linkedUser.email.split('@')[0];
        const newPlayer = await this.prisma.player.create({
          data: {
            id,
            name: defaultName,
            playerType: 'FIXED',
          },
        });

        // WHY: Update the user model playerId reference to self-heal link consistency.
        await this.prisma.user.update({
          where: { id },
          data: { playerId: id },
        });

        return newPlayer;
      }

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
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!player) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }

    // WHY: A linked user account references this player via a FK with no cascade —
    // deleting it would dangle that account. Block with a message that points at the
    // actual cause rather than the generic "has history" one below.
    if (player.user) {
      throw new ConflictException(
        'Não é possível eliminar este jogador porque tem uma conta de utilizador associada. Para apagar este perfil, primeiro associe a conta a outro jogador ou remova a conta de utilizador.',
      );
    }

    // WHY: Only block on actual match history (games played, MVP awards/votes, RSVPs,
    // championship titles). Auto-generated payment records alone are administrative
    // noise and must not prevent the admin from cleaning up test or ghost profiles —
    // those payments are deleted as part of the transaction below.
    const matchHistory = await this.countMatchHistory(id);
    if (matchHistory > 0) {
      throw new ConflictException(
        'Não é possível eliminar este jogador porque já participou em partidas ou recebeu prémios. Para preservar o histórico e as classificações, este perfil não pode ser apagado.',
      );
    }

    // WHY: Payments are auto-generated for every FIXED player at season start and do not
    // represent irreplaceable data on their own. Delete them first so the player FK is free.
    return this.prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({ where: { playerId: id } });
      return tx.player.delete({ where: { id } });
    });
  }

  // WHY: Only counts irreplaceable match history: games actually played, MVP awards/votes,
  // and championship titles. Payments and RSVPs are excluded — payments are auto-generated
  // and RSVPs have onDelete:Cascade so they are wiped automatically when the player is
  // deleted. Blocking on either of those would prevent cleaning up test/ghost profiles.
  private async countMatchHistory(id: string) {
    const [matches, mvpAwards, mvpVotesCast, mvpVotesReceived, championships] =
      await Promise.all([
        this.prisma.match.count({
          where: { OR: [{ teamAPlayers: { some: { id } } }, { teamBPlayers: { some: { id } } }] },
        }),
        this.prisma.match.count({ where: { mvpId: id } }),
        this.prisma.mvpVote.count({ where: { voterId: id } }),
        this.prisma.mvpVote.count({ where: { candidateId: id } }),
        this.prisma.season.count({ where: { championId: id } }),
      ]);

    return matches + mvpAwards + mvpVotesCast + mvpVotesReceived + championships;
  }

  // WHY: Lets an admin associate a freshly registered account with a pre-existing "ghost"
  // player profile (created ahead of time for someone who hadn't signed up yet), so that
  // person's match history and points carry over to their new account. The duplicate
  // profile auto-created at registration (Shared Identity Pattern) is safely discarded.
  async linkUser(targetPlayerId: string, linkUserDto: LinkUserDto) {
    const targetPlayer = await this.prisma.player.findUnique({
      where: { id: targetPlayerId },
      include: { user: true },
    });

    if (!targetPlayer) {
      throw new NotFoundException(`Player with ID ${targetPlayerId} not found`);
    }

    if (targetPlayer.user) {
      throw new ConflictException(
        'Este perfil de jogador já está associado a uma conta de utilizador.',
      );
    }

    const email = linkUserDto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException(`Não foi encontrado nenhum utilizador registado com o email ${email}`);
    }

    if (user.playerId === targetPlayerId) {
      throw new ConflictException('Esta conta já está associada a este jogador.');
    }

    const previousPlayerId = user.playerId;

    if (previousPlayerId) {
      const historyCount = await this.countMatchHistory(previousPlayerId);
      if (historyCount > 0) {
        throw new ConflictException(
          'Não é possível associar: esta conta já tem um perfil de jogador com histórico de partidas ou prémios. Associe contas apenas antes de a pessoa ter participado em jogos.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { playerId: targetPlayerId },
      });

      // WHY: Discard the empty duplicate profile created at registration.
      // Delete auto-generated payments first so the FK is free to cascade.
      if (previousPlayerId && previousPlayerId !== targetPlayerId) {
        await tx.payment.deleteMany({ where: { playerId: previousPlayerId } });
        await tx.player.delete({ where: { id: previousPlayerId } });
      }

      return tx.player.findUnique({
        where: { id: targetPlayerId },
        include: { user: true },
      });
    });
  }
}
