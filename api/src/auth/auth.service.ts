import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const userExists = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (userExists) {
      throw new ConflictException('User with this email already exists');
    }

    // WHY: Always salt and hash passwords before persistence. Cost factor of 10 is standard.
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        playerId: registerDto.playerId,
      },
    });

    const tokens = await this.getTokens(
      newUser.id,
      newUser.email,
      newUser.role,
    );
    await this.updateRefreshTokenHash(newUser.id, tokens.refreshToken);

    return tokens;
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.getTokens(
      user.id,
      user.email,
      user.role,
    );
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    // WHY: Invalidates the refresh token on the database side to prevent token reuse.
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        hashedRefreshToken: { not: null },
      },
      data: {
        hashedRefreshToken: null,
      },
    });
  }

  // --- Private Helper Methods ---

  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    // WHY: Just like passwords, refresh tokens must be hashed in the database.
    // If the DB is compromised, the attacker cannot use the raw refresh tokens to hijack sessions.
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hash },
    });
  }

  private async getTokens(userId: string, email: string, role: string) {
    const jwtPayload = { sub: userId, email, role };

    // WHY: Dual-token strategy. Short-lived access token minimizes damage if intercepted.
    // Long-lived refresh token keeps mobile users logged in without frustrating UX.
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: process.env.JWT_ACCESS_SECRET || 'fallback-access-secret',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}