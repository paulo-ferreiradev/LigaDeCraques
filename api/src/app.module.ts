import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PlayersModule } from './players/players.module';
import { SeasonsModule } from './seasons/seasons.module';

@Module({
  imports: [PrismaModule, PlayersModule, SeasonsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
