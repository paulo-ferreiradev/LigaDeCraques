import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateTeamsDto } from './dto/update-teams.dto';
import { RecordResultDto } from './dto/record-result.dto';
import { QueryMatchDto } from './dto/query-match.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { RsvpResponseDto } from './dto/rsvp-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMatchDto: CreateMatchDto) {
    // WHY: Verify the target season exists before scheduling matches in it.
    const season = await this.prisma.season.findUnique({
      where: { id: createMatchDto.seasonId },
    });
    if (!season) {
      throw new NotFoundException(`Season with ID ${createMatchDto.seasonId} not found`);
    }

    const baseDate = createMatchDto.playedAt ? new Date(createMatchDto.playedAt) : new Date();

    // Set kickoff playedAt to 22:30:00 of that day
    const playedAt = new Date(baseDate);
    playedAt.setHours(22, 30, 0, 0);

    // Set RSVP deadline to 20:00:00 of the exact same day
    const rsvpDeadline = new Date(baseDate);
    rsvpDeadline.setHours(20, 0, 0, 0);

    // Create the Match
    const match = await this.prisma.match.create({
      data: {
        seasonId: createMatchDto.seasonId,
        playedAt,
        rsvpDeadline,
        status: 'SCHEDULED',
      },
    });

    // WHY: Generate pending RSVPs only for FIXED players in the database.
    // Guest players are not required to RSVP.
    const fixedPlayers = await this.prisma.player.findMany({
      where: { playerType: 'FIXED' },
    });

    for (const player of fixedPlayers) {
      await this.prisma.rsvp.create({
        data: {
          matchId: match.id,
          playerId: player.id,
          status: 'PENDING',
        },
      });
    }

    return match;
  }

  async findOne(id: string) {
    // WHY: Retrieve comprehensive match details including rosters and MVP info for detailed pages.
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        season: true,
        teamAPlayers: true,
        teamBPlayers: true,
        mvp: true,
      },
    });

    if (!match) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }

    return match;
  }

  async findAll(query: QueryMatchDto) {
    const { seasonId, cursor, limit = 10 } = query;

    // WHY: Fetch limit + 1 to determine if another page exists for the client.
    const take = limit + 1;

    const matches = await this.prisma.match.findMany({
      take,
      where: {
        ...(seasonId && { seasonId }),
      },
      ...(cursor && {
        skip: 1, // Skip the cursor match itself
        cursor: { id: cursor },
      }),
      include: {
        season: true,
        teamAPlayers: true,
        teamBPlayers: true,
        mvp: true,
      },
      orderBy: { playedAt: 'desc' }, // Latest matches first
    });

    let nextCursor: string | null = null;
    if (matches.length > limit) {
      const nextItem = matches.pop();
      nextCursor = nextItem!.id;
    }

    return {
      data: matches,
      nextCursor,
    };
  }

  async updateTeams(id: string, updateTeamsDto: UpdateTeamsDto) {
    // WHY: Ensure the match exists.
    await this.findOne(id);

    // WHY: Prisma's 'set' operator automatically deletes existing M2M links and overwrites them
    // with the new player array in a highly performant and atomic single query.
    return this.prisma.match.update({
      where: { id },
      data: {
        teamAPlayers: {
          set: updateTeamsDto.teamAPlayerIds.map((playerId) => ({ id: playerId })),
        },
        teamBPlayers: {
          set: updateTeamsDto.teamBPlayerIds.map((playerId) => ({ id: playerId })),
        },
      },
      include: {
        teamAPlayers: true,
        teamBPlayers: true,
      },
    });
  }

  async recordResult(id: string, recordResultDto: RecordResultDto) {
    // WHY: Ensure the match exists first.
    await this.findOne(id);

    // WHY: In a database transaction, update the scores and rosters, and issue guest payments.
    return this.prisma.$transaction(async (tx) => {
      // 1. Update scores, assign rosters, and set status to VOTING.
      const match = await tx.match.update({
        where: { id },
        data: {
          teamAScore: recordResultDto.teamAScore,
          teamBScore: recordResultDto.teamBScore,
          mvpId: null,
          status: 'VOTING',
          teamAPlayers: {
            set: recordResultDto.teamAPlayerIds.map((playerId) => ({ id: playerId })),
          },
          teamBPlayers: {
            set: recordResultDto.teamBPlayerIds.map((playerId) => ({ id: playerId })),
          },
        },
        include: {
          season: true,
          teamAPlayers: true,
          teamBPlayers: true,
          mvp: true,
        },
      });

      // 2. Identify participating guest players to automatically bill them 3.00 €
      const allPlayerIds = [
        ...recordResultDto.teamAPlayerIds,
        ...recordResultDto.teamBPlayerIds,
      ];
      
      const guestPlayers = await tx.player.findMany({
        where: {
          id: { in: allPlayerIds },
          playerType: 'GUEST',
        },
      });

      // 3. Issue bills for guest players automatically.
      for (const guest of guestPlayers) {
        await tx.payment.create({
          data: {
            playerId: guest.id,
            amount: new Prisma.Decimal('3.00'),
            status: 'PENDING',
          },
        });
      }

      return match;
    });
  }

  async castMvpVote(matchId: string, userId: string, castVoteDto: CastVoteDto) {
    // 1. Identify the player profile linked to the authenticated user.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.playerId) {
      throw new BadRequestException('Your user account is not linked to any player profile.');
    }
    const voterId = user.playerId;

    // 2. Fetch the target match and include rosters to assert participation.
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { teamAPlayers: true, teamBPlayers: true },
    });
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }
    if (match.status !== 'VOTING') {
      throw new BadRequestException('MVP voting is not open for this match.');
    }

    // 3. Assert the voter actually played in either Team A or Team B roster.
    const voterPlayed =
      match.teamAPlayers.some((p) => p.id === voterId) ||
      match.teamBPlayers.some((p) => p.id === voterId);
    if (!voterPlayed) {
      throw new ForbiddenException('You did not participate in this match and cannot vote.');
    }

    // 4. Assert the candidate voted for actually played in either roster.
    const candidatePlayed =
      match.teamAPlayers.some((p) => p.id === castVoteDto.candidateId) ||
      match.teamBPlayers.some((p) => p.id === castVoteDto.candidateId);
    if (!candidatePlayed) {
      throw new BadRequestException('The selected candidate did not participate in this match.');
    }

    // 5. Assert the voter has not already cast a vote for this match.
    const existingVote = await this.prisma.mvpVote.findUnique({
      where: {
        matchId_voterId: { matchId, voterId },
      },
    });
    if (existingVote) {
      throw new ConflictException('You have already cast your vote for this match.');
    }

    // 6. Persist the vote.
    const vote = await this.prisma.mvpVote.create({
      data: {
        matchId,
        voterId,
        candidateId: castVoteDto.candidateId,
      },
    });

    // 7. Auto-finalization evaluation.
    // Count how many players in the match rosters actually have a registered User account.
    const participantIds = [
      ...match.teamAPlayers.map((p) => p.id),
      ...match.teamBPlayers.map((p) => p.id),
    ];
    const registeredUsersCount = await this.prisma.user.count({
      where: {
        playerId: { in: participantIds },
      },
    });

    // Count how many votes have been cast so far.
    const votesCount = await this.prisma.mvpVote.count({
      where: { matchId },
    });

    // If all registered participants have voted, automatically close voting and elect MVP.
    if (votesCount >= registeredUsersCount && registeredUsersCount > 0) {
      await this.finalizeVotingInternal(matchId);
    }

    return vote;
  }

  async getMyVote(matchId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.playerId) {
      return null;
    }

    // WHY: Returns the detailed vote cast by this user so they can see who they chose on the frontend.
    return this.prisma.mvpVote.findUnique({
      where: {
        matchId_voterId: { matchId, voterId: user.playerId },
      },
      include: {
        candidate: true,
      },
    });
  }

  async finalizeVoting(matchId: string) {
    // WHY: Admin bypass to force calculate the MVP and transition the match to COMPLETED early
    // (e.g. if some players do not vote or do not have accounts).
    return this.finalizeVotingInternal(matchId);
  }

  private async finalizeVotingInternal(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { teamAPlayers: true, teamBPlayers: true },
    });
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    const votes = await this.prisma.mvpVote.findMany({
      where: { matchId },
    });

    let electedMvpId: string | null = null;

    if (votes.length > 0) {
      // 1. Group votes by candidate and determine vote counts.
      const voteCounts = new Map<string, number>();
      votes.forEach((v) => {
        voteCounts.set(v.candidateId, (voteCounts.get(v.candidateId) || 0) + 1);
      });

      // 2. Find maximum votes and candidates who achieved them.
      let maxVotes = 0;
      let winners: string[] = [];
      for (const [candidateId, count] of voteCounts.entries()) {
        if (count > maxVotes) {
          maxVotes = count;
          winners = [candidateId];
        } else if (count === maxVotes) {
          winners.push(candidateId);
        }
      }

      // 3. Resolve ties using current season standings leaderboard.
      if (winners.length === 1) {
        electedMvpId = winners[0];
      } else if (winners.length > 1) {
        electedMvpId = await this.getStandingsTieBreakerWinner(match.seasonId, winners);
      }
    } else {
      // Fallback: If no one has voted yet and the Admin closes, pick the first player in Team A (if any) or null.
      const allParticipants = [...match.teamAPlayers, ...match.teamBPlayers];
      if (allParticipants.length > 0) {
        electedMvpId = allParticipants[0].id;
      }
    }

    // 4. Update match status to COMPLETED and assign elected MVP.
    // Standings dashboard will instantly reflect this completed game.
    return this.prisma.match.update({
      where: { id: matchId },
      data: {
        mvpId: electedMvpId,
        status: 'COMPLETED',
      },
      include: {
        season: true,
        teamAPlayers: true,
        teamBPlayers: true,
        mvp: true,
      },
    });
  }

  private async getStandingsTieBreakerWinner(
    seasonId: string,
    candidateIds: string[],
  ): Promise<string> {
    if (candidateIds.length === 0) return '';
    if (candidateIds.length === 1) return candidateIds[0];

    // WHY: Compute local lightweight standings for only the tied candidates using completed matches
    // to bypass circular module dependency constraints cleanly.
    const matches = await this.prisma.match.findMany({
      where: { seasonId, status: 'COMPLETED' },
      include: {
        teamAPlayers: true,
        teamBPlayers: true,
      },
    });

    const stats = new Map<string, { points: number; mvpCount: number }>();
    candidateIds.forEach((id) => stats.set(id, { points: 0, mvpCount: 0 }));

    for (const match of matches) {
      const scoreA = match.teamAScore ?? 0;
      const scoreB = match.teamBScore ?? 0;

      let pointsA = 1;
      let pointsB = 1;
      if (scoreA > scoreB) {
        pointsA = 3;
        pointsB = 1;
      } else if (scoreB > scoreA) {
        pointsA = 1;
        pointsB = 3;
      } else {
        pointsA = 2;
        pointsB = 2;
      }

      match.teamAPlayers.forEach((p) => {
        if (stats.has(p.id)) {
          stats.get(p.id)!.points += pointsA;
        }
      });

      match.teamBPlayers.forEach((p) => {
        if (stats.has(p.id)) {
          stats.get(p.id)!.points += pointsB;
        }
      });

      if (match.mvpId && stats.has(match.mvpId)) {
        stats.get(match.mvpId)!.mvpCount += 1;
      }
    }

    // Sort tied candidates: 1st Points (desc), 2nd MVP Counts (desc)
    const sorted = [...candidateIds].sort((a, b) => {
      const statA = stats.get(a)!;
      const statB = stats.get(b)!;
      if (statB.points !== statA.points) {
        return statB.points - statA.points;
      }
      return statB.mvpCount - statA.mvpCount;
    });

    return sorted[0];
  }

  async submitRsvp(matchId: string, userId: string, rsvpResponseDto: RsvpResponseDto) {
    // WHY: Identify the player profile linked to the authenticated user.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { player: true },
    });
    if (!user || !user.player) {
      throw new BadRequestException('Your user account is not linked to any player profile.');
    }

    // WHY: Only fixed players participate in match convocatórias. Guests are manually added during score entry.
    if (user.player.playerType !== 'FIXED') {
      throw new BadRequestException('Only fixed players can reply to match convocatórias.');
    }

    const playerId = user.player.id;

    // WHY: Ensure the target match exists.
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // WHY: Block RSVPs if the match has already started or concluded.
    if (match.status !== 'SCHEDULED') {
      throw new BadRequestException('Match is not scheduled or has already started.');
    }

    // WHY: Validate that the response deadline has not passed.
    if (match.rsvpDeadline && new Date() > new Date(match.rsvpDeadline)) {
      throw new BadRequestException('The RSVP deadline for this match has passed.');
    }

    // WHY: We use upsert to cleanly handle players registered after the match scheduling transaction,
    // guaranteeing idempotence and preventing unique constraint violations.
    return this.prisma.rsvp.upsert({
      where: {
        matchId_playerId: { matchId, playerId },
      },
      update: {
        status: rsvpResponseDto.status,
      },
      create: {
        matchId,
        playerId,
        status: rsvpResponseDto.status,
      },
    });
  }

  async getMyRsvp(matchId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.playerId) {
      return null;
    }

    // WHY: Quickly retrieve the individual RSVP state for the active player's profile dashboard.
    return this.prisma.rsvp.findUnique({
      where: {
        matchId_playerId: { matchId, playerId: user.playerId },
      },
    });
  }

  async getRsvps(matchId: string) {
    // WHY: Retrieve all convocatórias along with player profiles to group confirmed/absent attendees on Admin screens.
    return this.prisma.rsvp.findMany({
      where: { matchId },
      include: {
        player: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.match.delete({
      where: { id },
    });
  }
}
