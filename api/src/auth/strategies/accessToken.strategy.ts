import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  playerId?: string | null;
};

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    // WHY: Read authorization header as a Bearer token and enforce strict expiration checks.
    // Falls back to a local hardcoded key in development if env variable is unset.
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'fallback-access-secret',
    });
  }

  // WHY: The return value of validate() is automatically appended to NestJS request object (req.user).
  // This allows downstream guards and controllers to access the authenticated user context.
  validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      playerId: payload.playerId || null,
    };
  }
}
