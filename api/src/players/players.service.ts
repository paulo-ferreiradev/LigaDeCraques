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

    try {
      return await this.prisma.player.delete({
        where: { id },
      });
    } catch (error) {
      // WHY: Postgres rejects the delete with P2003 when the player still has matches,
      // payments, MVP awards/votes or RSVPs pointing at it. Surface a clear, friendly
      // message instead of a raw FK violation so historical standings stay intact.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Não é possível eliminar este jogador porque já tem partidas, pagamentos ou prémios associados. Para preservar o histórico e as classificações, este perfil não pode ser apagado.',
        );
      }
      throw error;
    }
  }

  // WHY: Counts every relation that would block a hard delete, so we can decide whether
  // a "ghost" duplicate profile (created automatically at registration) is safe to discard
  // when merging it into a pre-existing player profile.
  private async countPlayerHistory(id: string) {
    const [matches, payments, mvpAwards, mvpVotesCast, mvpVotesReceived, rsvps, championships] =
      await Promise.all([
        this.prisma.match.count({
          where: { OR: [{ teamAPlayers: { some: { id } } }, { teamBPlayers: { some: { id } } }] },
        }),
        this.prisma.payment.count({ where: { playerId: id } }),
        this.prisma.match.count({ where: { mvpId: id } }),
        this.prisma.mvpVote.count({ where: { voterId: id } }),
        this.prisma.mvpVote.count({ where: { candidateId: id } }),
        this.prisma.rsvp.count({ where: { playerId: id } }),
        this.prisma.season.count({ where: { championId: id } }),
      ]);

    return (
      matches + payments + mvpAwards + mvpVotesCast + mvpVotesReceived + rsvps + championships
    );
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
      const historyCount = await this.countPlayerHistory(previousPlayerId);
      if (historyCount > 0) {
        throw new ConflictException(
          'Não é possível associar: esta conta já tem um perfil de jogador com histórico de partidas, pagamentos ou prémios. Associe contas apenas antes de a pessoa ter participado em jogos.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { playerId: targetPlayerId },
      });

      // WHY: Discard the empty duplicate profile created automatically at registration,
      // now that the account points to the pre-existing profile with the real history.
      if (previousPlayerId && previousPlayerId !== targetPlayerId) {
        await tx.player.delete({ where: { id: previousPlayerId } });
      }

      return tx.player.findUnique({
        where: { id: targetPlayerId },
        include: { user: true },
      });
    });
  }
}
