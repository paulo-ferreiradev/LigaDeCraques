import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PlayersModule } from './players/players.module';

@Module({
  imports: [PrismaModule, PlayersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
