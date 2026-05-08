import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  // WHY: We register JwtModule generically here. Specific secrets and expirations 
  // are handled dynamically in the AuthService for Access/Refresh variations.
  imports: [PrismaModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}