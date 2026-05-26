import { Module } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService], // WHY: Export in case other modules (like seasons leaderboard or statistics) need match logic.
})
export class MatchesModule {}
