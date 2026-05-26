import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { QuerySeasonDto } from './dto/query-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) { }

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

  async findOne(id: string) {
    // WHY: Assert the season exists before operations. Reusable across update and leaderboard lookups.
    const season = await this.prisma.season.findUnique({
      where: { id },
    });
    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }
    return season;
  }

  async findActive() {
    // WHY: Returns the active season or null directly. This prevents 404 HTTP errors in the frontend
    // when the database is empty or no season has been officially activated yet.
    return this.prisma.season.findFirst({
      where: { status: 'ACTIVE' },
    });
  }

  async update(id: string, updateSeasonDto: UpdateSeasonDto) {
    // WHY: Validates existence first.
    await this.findOne(id);

    let championId: string | null | undefined = undefined;

    if (updateSeasonDto.status === 'FINISHED') {
      // WHY: Automatically compute and assign the season champion from the leaderboard on season close.
      const standings = await this.getLeaderboard(id);
      if (standings.length > 0) {
        championId = standings[0].playerId;
      }
    } else if (updateSeasonDto.status === 'ACTIVE') {
      // WHY: If a season is re-opened/re-activated, clear the champion title to allow clean testing.
      championId = null;
    }

    return this.prisma.season.update({
      where: { id },
      data: {
        ...updateSeasonDto,
        ...(championId !== undefined && { championId }),
      },
    });
  }

  async getLeaderboard(seasonId: string) {
    // WHY: Confirm the season is valid.
    await this.findOne(seasonId);

    const matches = await this.prisma.match.findMany({
      where: { seasonId, status: 'COMPLETED' },
      include: {
        teamAPlayers: {
          where: { playerType: 'FIXED' },
        },
        teamBPlayers: {
          where: { playerType: 'FIXED' },
        },
      },
    });

    // WHY: Map structure accumulates statistics per player during the loop.
    const standingsMap = new Map<
      string,
      {
        playerId: string;
        name: string;
        matchesPlayed: number;
        wins: number;
        draws: number;
        losses: number;
        mvpCount: number;
        points: number;
      }
    >();

    const getOrCreateStanding = (playerId: string, name: string) => {
      if (!standingsMap.has(playerId)) {
        standingsMap.set(playerId, {
          playerId,
          name,
          matchesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          mvpCount: 0,
          points: 0,
        });
      }
      return standingsMap.get(playerId)!;
    };

    // WHY: We loop through each match. Win = 3 points, Draw = 2 points, Loss = 1 point.
    for (const match of matches) {
      const scoreA = match.teamAScore ?? 0;
      const scoreB = match.teamBScore ?? 0;

      let pointsA = 1;
      let pointsB = 1;
      let result: 'A' | 'B' | 'D' = 'D';

      if (scoreA > scoreB) {
        pointsA = 3;
        pointsB = 1;
        result = 'A';
      } else if (scoreB > scoreA) {
        pointsA = 1;
        pointsB = 3;
        result = 'B';
      } else {
        pointsA = 2;
        pointsB = 2;
        result = 'D';
      }

      for (const p of match.teamAPlayers) {
        const std = getOrCreateStanding(p.id, p.name);
        std.matchesPlayed += 1;
        std.points += pointsA;
        if (result === 'A') std.wins += 1;
        else if (result === 'B') std.losses += 1;
        else std.draws += 1;
      }

      for (const p of match.teamBPlayers) {
        const std = getOrCreateStanding(p.id, p.name);
        std.matchesPlayed += 1;
        std.points += pointsB;
        if (result === 'B') std.wins += 1;
        else if (result === 'A') std.losses += 1;
        else std.draws += 1;
      }

      // WHY: If an MVP was assigned, we increment their count.
      if (match.mvpId) {
        const mvpPlayer =
          match.teamAPlayers.find((p) => p.id === match.mvpId) ||
          match.teamBPlayers.find((p) => p.id === match.mvpId);

        if (mvpPlayer) {
          const std = getOrCreateStanding(mvpPlayer.id, mvpPlayer.name);
          std.mvpCount += 1;
        }
      }
    }

    const standingsList = Array.from(standingsMap.values());

    // WHY: Standard sorting priorities: 1st Points (Desc), 2nd MVP Counts (Desc), 3rd Matches Played (Asc - efficiency).
    return standingsList.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.mvpCount !== a.mvpCount) {
        return b.mvpCount - a.mvpCount;
      }
      return a.matchesPlayed - b.matchesPlayed;
    });
  }

  async getHallOfFame() {
    // WHY: Retrieve all finished seasons with a calculated champion, loading champion profiles.
    const finishedSeasons = await this.prisma.season.findMany({
      where: {
        status: 'FINISHED',
        championId: { not: null },
      },
      include: {
        champion: true,
      },
    });

    const championsMap = new Map<
      string,
      {
        playerId: string;
        name: string;
        titlesCount: number;
        seasons: string[];
      }
    >();

    for (const season of finishedSeasons) {
      if (season.champion) {
        const champ = season.champion;
        if (!championsMap.has(champ.id)) {
          championsMap.set(champ.id, {
            playerId: champ.id,
            name: champ.name,
            titlesCount: 0,
            seasons: [],
          });
        }
        const record = championsMap.get(champ.id)!;
        record.titlesCount += 1;
        record.seasons.push(`${season.year} ${season.seasonType}`);
      }
    }

    const list = Array.from(championsMap.values());
    // WHY: Return sorted decresingly by count of titles won.
    return list.sort((a, b) => b.titlesCount - a.titlesCount);
  }

  async remove(id: string) {
    // WHY: Verify that the season exists first.
    await this.findOne(id);

    // WHY: Use a transaction to cascade-delete all matches in this season.
    // Due to database cascade constraints on Match relations, this cleanly clears RSVPs and votes.
    return this.prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({
        where: { seasonId: id },
      });

      return tx.season.delete({
        where: { id },
      });
    });
  }
}
