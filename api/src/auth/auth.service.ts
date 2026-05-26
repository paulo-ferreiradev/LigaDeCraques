import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
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

    // WHY: Use a database transaction to ensure that the user and their player profile
    // are created atomically with the exact same UUID (Shared Identity Pattern).
    const result = await this.prisma.$transaction(async (tx) => {
      const entityId = randomUUID();
      const defaultPlayerName = registerDto.playerName || registerDto.email.split('@')[0];

      // WHY: Automatically provision the Player profile first using the shared entity UUID.
      const player = await tx.player.create({
        data: {
          id: entityId,
          name: defaultPlayerName,
        },
      });

      const user = await tx.user.create({
        data: {
          id: entityId,
          email: registerDto.email,
          passwordHash,
          playerId: entityId,
        },
      });

      return user;
    });

    const tokens = await this.getTokens(
      result.id,
      result.email,
      result.role,
      result.playerId,
    );
    await this.updateRefreshTokenHash(result.id, tokens.refreshToken);

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

    const tokens = await this.getTokens(user.id, user.email, user.role, user.playerId);
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

  async refreshTokens(userId: string, refreshToken: string) {
    // WHY: Find user by ID to assert existence and retrieve the current hashed refresh token.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // WHY: Deny access if the user record does not exist or if the user is already logged out (hashedRefreshToken is null).
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    // WHY: Compare raw refresh token with database hash to verify identity.
    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    // WHY: Generate a fresh set of tokens and rotate/hash the new refresh token in the database.
    const tokens = await this.getTokens(user.id, user.email, user.role, user.playerId);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
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

  private async getTokens(
    userId: string,
    email: string,
    role: string,
    playerId: string | null,
  ) {
    // WHY: Including playerId in the JWT payload eliminates extra API requests for fetching basic player context upon login.
    const jwtPayload = { sub: userId, email, role, playerId };

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
