import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  playerId?: string | null;
};

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    // WHY: We need passReqToCallback: true to grab the raw token string from the request headers.
    // Enforces JWT expiration and validates using the refresh secret.
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
      passReqToCallback: true,
    });
  }

  // WHY: Validates the payload and returns the payload context along with the raw refresh token.
  // This is critical because the AuthService needs the raw refresh token to compare it to the hashed DB record.
  validate(req: Request, payload: JwtPayload) {
    const authorizationHeader = req.get('Authorization');
    if (!authorizationHeader) {
      return null;
    }
    const refreshToken = authorizationHeader.replace('Bearer ', '').trim();
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      playerId: payload.playerId || null,
      refreshToken,
    };
  }
}
