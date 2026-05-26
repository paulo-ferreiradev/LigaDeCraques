import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
// WHY: Extends Passport's AuthGuard for the specific 'jwt-refresh' strategy. 
// Wraps the strategy logic to avoid magic strings inside controllers.
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {}
