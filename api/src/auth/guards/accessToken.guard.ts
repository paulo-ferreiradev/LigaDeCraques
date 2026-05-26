import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
// WHY: Extends Passport's built-in AuthGuard. Using a custom class wrapper prevents hardcoding 
// strategy string triggers (like 'jwt') inside our controllers, simplifying maintenance.
export class AccessTokenGuard extends AuthGuard('jwt') {}
